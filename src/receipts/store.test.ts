import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ReceiptStore } from './store.js';
import type { RecordReceiptInput } from './types.js';

const receiptInput = (overrides: Partial<RecordReceiptInput> = {}): RecordReceiptInput => ({
  intakeId: randomUUID(),
  merchant: 'Corner Market',
  purchaseDate: '2026-08-02',
  total: 1099,
  accountHint: 'Daily card',
  lineGroups: [
    { description: 'Food', category: 'Groceries', amount: 999 },
    { description: 'Allocated sales tax', category: 'Groceries', amount: 100 },
  ],
  tax: 100,
  notes: 'Structured extraction only',
  ...overrides,
});

describe('ReceiptStore', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'actual-mcp-receipts-'));
  });

  afterEach(() => {
    delete process.env.ACTUAL_MCP_RECEIPT_DIR;
    delete process.env.ACTUAL_DATA_DIR;
  });

  it('records structured receipt cents and persists them for a new store instance', async () => {
    const firstStore = new ReceiptStore(directory);
    const recorded = await firstStore.record(receiptInput());

    expect(recorded.duplicate).toBe(false);
    expect(recorded.receipt).toMatchObject({
      merchant: 'Corner Market',
      purchaseDate: '2026-08-02',
      total: 1099,
      status: 'pending',
    });
    expect(recorded.receipt.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(recorded.receipt.createdAt).toBe(recorded.receipt.updatedAt);

    const secondStore = new ReceiptStore(directory);
    expect(await secondStore.list()).toEqual([recorded.receipt]);
    const persisted = JSON.parse(await readFile(join(directory, 'receipts.json'), 'utf8')) as unknown[];
    expect(persisted).toHaveLength(1);
  });

  it('rejects mismatched totals and ambiguous numeric or date inputs', async () => {
    const store = new ReceiptStore(directory);
    await expect(store.record(receiptInput({ total: 1100 }))).rejects.toThrow(
      'Line group amounts must sum exactly to total'
    );
    await expect(store.record(receiptInput({ total: 1099.5 }))).rejects.toThrow();
    await expect(store.record(receiptInput({ purchaseDate: '2026-02-30' }))).rejects.toThrow(
      'purchaseDate must be valid'
    );
  });

  it('uses intakeId as the sole idempotency key across every status', async () => {
    const store = new ReceiptStore(directory);
    const intakeId = randomUUID();
    const input = receiptInput({ intakeId });
    const original = await store.record(input);
    await store.update({ id: original.receipt.id, status: 'expired' });
    const duplicate = await store.record({
      lineGroups: input.lineGroups.map((line) => ({ ...line })),
      notes: input.notes,
      tax: input.tax,
      accountHint: input.accountHint,
      total: input.total,
      purchaseDate: input.purchaseDate,
      merchant: input.merchant,
      intakeId,
    });

    expect(duplicate).toMatchObject({ receipt: { id: original.receipt.id, status: 'expired' }, duplicate: true });
    expect(await store.list('expired')).toHaveLength(1);

    const legitimateRepeat = await store.record(receiptInput());
    expect(legitimateRepeat.duplicate).toBe(false);
    expect(legitimateRepeat.receipt.id).not.toBe(original.receipt.id);
  });

  it('fails closed when an existing intakeId is reused with a conflicting payload', async () => {
    const store = new ReceiptStore(directory);
    const intakeId = randomUUID();
    await store.record(receiptInput({ intakeId }));

    await expect(store.record(receiptInput({ intakeId, merchant: 'Different merchant' }))).rejects.toThrow(
      'intakeId already exists with a different payload'
    );
    expect(await store.list()).toHaveLength(1);
  });

  it('filters statuses and defaults listing to pending', async () => {
    const store = new ReceiptStore(directory);
    const pending = (await store.record(receiptInput())).receipt;
    await store.update({ id: pending.id, status: 'needs-review', reason: 'No unique bank match' });
    await store.record(receiptInput({ merchant: 'Other Shop' }));

    expect(await store.list()).toHaveLength(1);
    expect(await store.list('needs-review')).toMatchObject([{ reviewReason: 'No unique bank match' }]);
  });

  it('enforces lifecycle transitions and matching metadata', async () => {
    const store = new ReceiptStore(directory);
    const receipt = (await store.record(receiptInput())).receipt;

    await expect(store.update({ id: receipt.id, status: 'matched' })).rejects.toThrow(
      'matchedTransactionId is required'
    );
    const matched = await store.update({
      id: receipt.id,
      status: 'matched',
      matchedTransactionId: 'actual-transaction-id',
    });
    expect(matched).toMatchObject({
      status: 'matched',
      matchedTransactionId: 'actual-transaction-id',
    });
    expect(matched.matchedAt).toBeDefined();
    await expect(store.update({ id: receipt.id, status: 'pending' })).rejects.toThrow(
      'Invalid receipt status transition from matched to pending'
    );
  });

  it('requires a reason for needs-review and treats expired as terminal', async () => {
    const store = new ReceiptStore(directory);
    const receipt = (await store.record(receiptInput())).receipt;
    await expect(store.update({ id: receipt.id, status: 'needs-review' })).rejects.toThrow('reason is required');
    await store.update({ id: receipt.id, status: 'expired' });
    await expect(store.update({ id: receipt.id, status: 'needs-review', reason: 'late match' })).rejects.toThrow(
      'Invalid receipt status transition from expired to needs-review'
    );
  });

  it('makes lifecycle retries idempotent only when their metadata agrees', async () => {
    const store = new ReceiptStore(directory);
    const first = (await store.record(receiptInput())).receipt;
    const matched = await store.update({ id: first.id, status: 'matched', matchedTransactionId: 'transaction-1' });
    expect(await store.update({ id: first.id, status: 'matched', matchedTransactionId: 'transaction-1' })).toEqual(
      matched
    );
    await expect(
      store.update({ id: first.id, status: 'matched', matchedTransactionId: 'transaction-2' })
    ).rejects.toThrow('Conflicting retry');

    const second = (await store.record(receiptInput())).receipt;
    const review = await store.update({ id: second.id, status: 'needs-review', reason: 'ambiguous' });
    expect(await store.update({ id: second.id, status: 'needs-review', reason: 'ambiguous' })).toEqual(review);
    await expect(store.update({ id: second.id, status: 'needs-review', reason: 'different' })).rejects.toThrow(
      'Conflicting retry'
    );
  });

  it('strictly validates every persisted record and rejects duplicate identifiers', async () => {
    const store = new ReceiptStore(directory);
    const valid = (await store.record(receiptInput())).receipt;
    const malformedRecords: Array<[string, unknown[]]> = [
      ['unknown fields', [{ ...valid, imageUrl: 'https://example.test/receipt' }]],
      ['invalid lifecycle metadata', [{ ...valid, status: 'matched' }]],
      ['bad line sums', [{ ...valid, total: valid.total + 1 }]],
      ['invalid timestamps', [{ ...valid, createdAt: 'yesterday' }]],
      ['duplicate receipt IDs', [valid, { ...valid, intakeId: randomUUID() }]],
      ['duplicate intake IDs', [valid, { ...valid, id: randomUUID() }]],
    ];

    for (const [label, records] of malformedRecords) {
      await writeFile(store.filePath, JSON.stringify(records));
      await expect(store.list(), label).rejects.toThrow();
    }
  });

  it('enforces conservative input bounds and uses exact integer-cent sums', async () => {
    const store = new ReceiptStore(directory);
    await expect(store.record(receiptInput({ merchant: 'm'.repeat(201) }))).rejects.toThrow();
    await expect(store.record(receiptInput({ accountHint: 'a'.repeat(101) }))).rejects.toThrow();
    await expect(store.record(receiptInput({ notes: 'n'.repeat(2001) }))).rejects.toThrow();
    await expect(
      store.record(receiptInput({ lineGroups: [{ description: 'd'.repeat(201), category: 'c', amount: 1099 }] }))
    ).rejects.toThrow();
    await expect(
      store.record(
        receiptInput({
          total: 101,
          lineGroups: Array.from({ length: 101 }, () => ({ description: 'item', category: 'other', amount: 1 })),
        })
      )
    ).rejects.toThrow();
    await expect(
      store.record(
        receiptInput({
          total: 1_000_000_001,
          lineGroups: [{ description: 'x', category: 'x', amount: 1_000_000_001 }],
        })
      )
    ).rejects.toThrow();
    await expect(
      store.record(
        receiptInput({
          total: 1,
          lineGroups: [
            { description: 'large', category: 'x', amount: 1_000_000_000 },
            { description: 'offset', category: 'x', amount: -999_999_999 },
          ],
        })
      )
    ).resolves.toMatchObject({ duplicate: false });
  });

  it('rejects oversized queue files and refuses to append beyond the record limit', async () => {
    const store = new ReceiptStore(directory);
    await writeFile(store.filePath, ' '.repeat(10 * 1024 * 1024 + 1));
    await expect(store.list()).rejects.toThrow('exceeds');

    const templateDirectory = await mkdtemp(join(tmpdir(), 'actual-mcp-template-'));
    const template = (await new ReceiptStore(templateDirectory).record(receiptInput())).receipt;
    const records = Array.from({ length: 10_000 }, (_, index) => ({
      ...template,
      id: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
      intakeId: `10000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
    }));
    await writeFile(store.filePath, JSON.stringify(records));
    await expect(store.record(receiptInput())).rejects.toThrow('maximum record count');
  });

  it('refuses a mutation that would make the serialized queue exceed the byte limit', async () => {
    const store = new ReceiptStore(directory);
    const templateDirectory = await mkdtemp(join(tmpdir(), 'actual-mcp-size-template-'));
    const template = (
      await new ReceiptStore(templateDirectory).record(
        receiptInput({
          merchant: 'm'.repeat(200),
          accountHint: 'a'.repeat(100),
          notes: 'n'.repeat(2000),
          total: 100,
          lineGroups: Array.from({ length: 100 }, (_, index) => ({
            description: `${index}`.padEnd(200, 'd'),
            category: 'c'.repeat(200),
            amount: 1,
          })),
        })
      )
    ).receipt;
    const records = Array.from({ length: 203 }, (_, index) => ({
      ...template,
      id: `20000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
      intakeId: `30000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
    }));
    await writeFile(store.filePath, JSON.stringify(records));

    await expect(
      store.record(
        receiptInput({
          merchant: 'z'.repeat(200),
          accountHint: 'b'.repeat(100),
          notes: 'q'.repeat(2000),
          total: 100,
          lineGroups: Array.from({ length: 100 }, (_, index) => ({
            description: `${index}`.padEnd(200, 'x'),
            category: 'y'.repeat(200),
            amount: 1,
          })),
        })
      )
    ).rejects.toThrow('would exceed');
    await expect(store.list()).resolves.toHaveLength(203);
  });

  it('serializes concurrent writes without losing receipts and leaves no temp files', async () => {
    const store = new ReceiptStore(directory);
    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        new ReceiptStore(directory).record(
          receiptInput({
            merchant: `Merchant ${index}`,
            total: 100,
            lineGroups: [{ description: 'Item', category: 'Other', amount: 100 }],
          })
        )
      )
    );

    expect(await store.list()).toHaveLength(20);
    expect((await readdir(directory)).sort()).toEqual(['receipts.json']);
    expect(JSON.parse(await readFile(join(directory, 'receipts.json'), 'utf8'))).toHaveLength(20);
  });

  it('resolves storage only from environment configuration', () => {
    process.env.ACTUAL_DATA_DIR = directory;
    expect(new ReceiptStore().filePath).toBe(join(directory, 'receipts', 'receipts.json'));
    process.env.ACTUAL_MCP_RECEIPT_DIR = join(directory, 'dedicated');
    expect(new ReceiptStore().filePath).toBe(join(directory, 'dedicated', 'receipts.json'));
  });
});
