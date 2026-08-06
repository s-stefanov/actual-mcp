import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getReceipts, recordReceipt, updateReceipt } from './index.js';

const parseResult = (result: Awaited<ReturnType<typeof recordReceipt.handler>>): Record<string, unknown> =>
  JSON.parse((result.content[0] as { text: string }).text) as Record<string, unknown>;

describe('receipt MCP tools', () => {
  beforeEach(async () => {
    process.env.ACTUAL_MCP_RECEIPT_DIR = await mkdtemp(join(tmpdir(), 'actual-mcp-tools-'));
  });

  afterEach(() => {
    delete process.env.ACTUAL_MCP_RECEIPT_DIR;
  });

  it('records, gets, and updates receipts through structured MCP results', async () => {
    const created = parseResult(
      await recordReceipt.handler({
        intakeId: randomUUID(),
        merchant: 'Cafe',
        purchaseDate: '2026-08-02',
        total: 500,
        lineGroups: [{ description: 'Lunch', category: 'Dining', amount: 500 }],
      })
    );
    expect(created).toMatchObject({ duplicate: false });
    const receipt = created.receipt as { id: string };
    expect(created.receiptId).toBe(receipt.id);

    const listed = parseResult(await getReceipts.handler({}));
    expect(listed.receipts).toMatchObject([{ id: receipt.id, status: 'pending' }]);

    const updated = parseResult(
      await updateReceipt.handler({ id: receipt.id, status: 'needs-review', reason: 'Ambiguous account' })
    );
    expect(updated.receipt).toMatchObject({ status: 'needs-review', reviewReason: 'Ambiguous account' });
  });

  it('returns validation errors without accepting image data or paths', async () => {
    const result = await recordReceipt.handler({
      intakeId: randomUUID(),
      merchant: 'Cafe',
      purchaseDate: '2026-08-02',
      total: 500,
      lineGroups: [{ description: 'Lunch', category: 'Dining', amount: 500 }],
      imagePath: '/tmp/receipt.jpg',
    } as never);

    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('Unrecognized key');
  });

  it('exposes read/write schemas with no storage path argument', () => {
    expect(getReceipts.schema.name).toBe('get-receipts');
    expect(recordReceipt.schema.name).toBe('record-receipt');
    expect(updateReceipt.schema.name).toBe('update-receipt');
    expect(JSON.stringify([getReceipts.schema, recordReceipt.schema, updateReceipt.schema])).not.toContain(
      'receiptDir'
    );
  });
});
