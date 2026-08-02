import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  MAX_QUEUE_BYTES,
  MAX_RECEIPTS,
  ReceiptArraySchema,
  ReceiptStatusSchema,
  RecordReceiptInputSchema,
  UpdateReceiptInputSchema,
} from './types.js';
import type { Receipt, ReceiptStatus, RecordReceiptInput, RecordReceiptResult, UpdateReceiptInput } from './types.js';

const writes = new Map<string, Promise<void>>();

function configuredDirectory(): string {
  if (process.env.ACTUAL_MCP_RECEIPT_DIR) {
    return resolve(process.env.ACTUAL_MCP_RECEIPT_DIR);
  }
  const actualDataDirectory = process.env.ACTUAL_DATA_DIR
    ? resolve(process.env.ACTUAL_DATA_DIR)
    : resolve(homedir() || '.', '.actual');
  return join(actualDataDirectory, 'receipts');
}

const transitions: Record<ReceiptStatus, readonly ReceiptStatus[]> = {
  pending: ['matched', 'needs-review', 'expired'],
  'needs-review': ['pending', 'matched', 'expired'],
  matched: [],
  expired: [],
};

function payloadOf(receipt: Receipt): RecordReceiptInput {
  return {
    intakeId: receipt.intakeId,
    merchant: receipt.merchant,
    purchaseDate: receipt.purchaseDate,
    total: receipt.total,
    ...(receipt.accountHint === undefined ? {} : { accountHint: receipt.accountHint }),
    lineGroups: receipt.lineGroups,
    ...(receipt.tax === undefined ? {} : { tax: receipt.tax }),
    ...(receipt.discount === undefined ? {} : { discount: receipt.discount }),
    ...(receipt.notes === undefined ? {} : { notes: receipt.notes }),
  };
}

function payloadsAgree(existing: Receipt, input: RecordReceiptInput): boolean {
  return JSON.stringify(payloadOf(existing)) === JSON.stringify(input);
}

function assertExactLineTotal(input: RecordReceiptInput): void {
  const lineTotal = input.lineGroups.reduce((sum, group) => sum + BigInt(group.amount), 0n);
  if (lineTotal !== BigInt(input.total)) {
    throw new Error(`Line group amounts must sum exactly to total (${lineTotal} != ${input.total})`);
  }
}

/** JSON-backed queue whose mutations are serialized per resolved file path. */
export class ReceiptStore {
  public readonly filePath: string;

  public constructor(directory = configuredDirectory()) {
    this.filePath = join(resolve(directory), 'receipts.json');
  }

  public async record(input: RecordReceiptInput): Promise<RecordReceiptResult> {
    const parsed = RecordReceiptInputSchema.parse(input);
    assertExactLineTotal(parsed);

    return this.withLock(async () => {
      const receipts = await this.load();
      const existing = receipts.find((receipt) => receipt.intakeId === parsed.intakeId);
      if (existing) {
        if (!payloadsAgree(existing, parsed)) {
          throw new Error('intakeId already exists with a different payload');
        }
        return { receipt: existing, duplicate: true };
      }
      if (receipts.length >= MAX_RECEIPTS) {
        throw new Error(`Receipt queue has reached the maximum record count (${MAX_RECEIPTS})`);
      }

      const now = new Date().toISOString();
      const receipt: Receipt = {
        ...parsed,
        id: randomUUID(),
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      receipts.push(receipt);
      await this.persist(receipts);
      return { receipt, duplicate: false };
    });
  }

  public async list(status: ReceiptStatus = 'pending'): Promise<Receipt[]> {
    const validatedStatus = ReceiptStatusSchema.parse(status);
    return this.withLock(async () => (await this.load()).filter((receipt) => receipt.status === validatedStatus));
  }

  public async update(input: UpdateReceiptInput): Promise<Receipt> {
    const parsed = UpdateReceiptInputSchema.parse(input);
    return this.withLock(async () => {
      const receipts = await this.load();
      const index = receipts.findIndex((receipt) => receipt.id === parsed.id);
      if (index < 0) {
        throw new Error(`Receipt not found: ${parsed.id}`);
      }
      const current = receipts[index];
      this.validateUpdateMetadata(parsed);

      if (current.status === parsed.status) {
        const agrees =
          (parsed.status === 'matched' && current.matchedTransactionId === parsed.matchedTransactionId) ||
          (parsed.status === 'needs-review' && current.reviewReason === parsed.reason) ||
          ((parsed.status === 'pending' || parsed.status === 'expired') &&
            parsed.matchedTransactionId === undefined &&
            parsed.reason === undefined);
        if (!agrees) {
          throw new Error(`Conflicting retry for receipt already in ${current.status} status`);
        }
        return current;
      }

      if (!transitions[current.status].includes(parsed.status)) {
        throw new Error(`Invalid receipt status transition from ${current.status} to ${parsed.status}`);
      }

      const now = new Date().toISOString();
      const updated: Receipt = {
        ...current,
        status: parsed.status,
        updatedAt: now,
      };
      delete updated.reviewReason;
      delete updated.matchedTransactionId;
      delete updated.matchedAt;
      if (parsed.status === 'matched') {
        updated.matchedTransactionId = parsed.matchedTransactionId;
        updated.matchedAt = now;
      } else if (parsed.status === 'needs-review') {
        updated.reviewReason = parsed.reason;
      }
      receipts[index] = updated;
      await this.persist(receipts);
      return updated;
    });
  }

  private validateUpdateMetadata(input: UpdateReceiptInput): void {
    if (input.status === 'matched' && !input.matchedTransactionId) {
      throw new Error('matchedTransactionId is required when status is matched');
    }
    if (input.status === 'needs-review' && !input.reason) {
      throw new Error('reason is required when status is needs-review');
    }
    if (input.status !== 'matched' && input.matchedTransactionId) {
      throw new Error('matchedTransactionId is only valid when status is matched');
    }
    if (input.status !== 'needs-review' && input.reason) {
      throw new Error('reason is only valid when status is needs-review');
    }
  }

  private async load(): Promise<Receipt[]> {
    let handle;
    try {
      handle = await open(this.filePath, 'r');
      const buffer = Buffer.allocUnsafe(MAX_QUEUE_BYTES + 1);
      let bytesRead = 0;
      while (bytesRead < buffer.length) {
        const result = await handle.read(buffer, bytesRead, buffer.length - bytesRead, null);
        if (result.bytesRead === 0) break;
        bytesRead += result.bytesRead;
      }
      if (bytesRead > MAX_QUEUE_BYTES) {
        throw new Error(`Receipt queue file exceeds ${MAX_QUEUE_BYTES} bytes`);
      }
      const value: unknown = JSON.parse(buffer.toString('utf8', 0, bytesRead));
      const receipts = ReceiptArraySchema.parse(value);
      const ids = new Set<string>();
      const intakeIds = new Set<string>();
      for (const receipt of receipts) {
        if (ids.has(receipt.id)) throw new Error(`Duplicate receipt id: ${receipt.id}`);
        if (intakeIds.has(receipt.intakeId)) throw new Error(`Duplicate receipt intakeId: ${receipt.intakeId}`);
        ids.add(receipt.id);
        intakeIds.add(receipt.intakeId);
      }
      return receipts;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    } finally {
      await handle?.close();
    }
  }

  private async persist(receipts: Receipt[]): Promise<void> {
    const serialized = `${JSON.stringify(receipts, null, 2)}\n`;
    const serializedBytes = Buffer.byteLength(serialized, 'utf8');
    if (serializedBytes > MAX_QUEUE_BYTES) {
      throw new Error(`Receipt queue mutation would exceed ${MAX_QUEUE_BYTES} bytes`);
    }

    const directory = dirname(this.filePath);
    await mkdir(directory, { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    let temporaryHandle;
    try {
      temporaryHandle = await open(temporaryPath, 'wx', 0o600);
      await temporaryHandle.writeFile(serialized, 'utf8');
      await temporaryHandle.sync();
      await temporaryHandle.close();
      temporaryHandle = undefined;
      await rename(temporaryPath, this.filePath);

      const directoryHandle = await open(directory, 'r');
      try {
        await directoryHandle.sync();
      } finally {
        await directoryHandle.close();
      }
    } catch (error) {
      await temporaryHandle?.close().catch(() => undefined);
      await rm(temporaryPath, { force: true });
      throw error;
    }
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = writes.get(this.filePath) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolveLock) => {
      release = resolveLock;
    });
    writes.set(this.filePath, current);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (writes.get(this.filePath) === current) writes.delete(this.filePath);
    }
  }
}
