import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('imports + reports (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('import-transactions adds a transaction that persists (mutation + persistence)', async () => {
    const token = `E2E ${randomUUID()}`;
    const importRes = await mcp.callTool('import-transactions', {
      accountId: ctx.ids.accounts['Savings'],
      transactions: [
        {
          imported_id: token,
          date: '2025-03-05',
          // Reason: import-transactions' ImportTransactionItemSchema (src/types.ts)
          // documents amount as "a decimal number (e.g. 3.24 for $3.24)" — unlike
          // create-transaction, which takes integer cents. The handler converts via
          // utils.amountToInteger before calling the API, so -42 here becomes -$42.00.
          amount: -42,
          payee_name: token,
        },
      ],
    });
    expect(importRes.isError).toBe(false);

    const read = await mcp.callTool('get-transactions', {
      accountId: ctx.ids.accounts['Savings'],
      startDate: '2025-03-01',
      endDate: '2025-03-31',
    });
    expect(read.isError).toBe(false);
    expect(read.text).toContain(token);
  });

  it('import-transactions with a missing accountId returns isError (failure path)', async () => {
    const res = await mcp.callTool('import-transactions', { transactions: [] });
    expect(res.isError).toBe(true);
  });

  it('run-bank-sync succeeds with no linked accounts (happy path / no-op)', async () => {
    // Reason: confirmed via node_modules/@actual-app/api/dist/index.js
    // (accountsBankSync) that the sync loop only acts on accounts with a
    // bankId + account_id; seeded accounts have neither, so the loop body
    // never runs, `errors` stays empty, and no exception is thrown. This is
    // a clean no-op success, not an error.
    const res = await mcp.callTool('run-bank-sync', {});
    expect(res.isError).toBe(false);
  });

  it('spending-by-category returns a report (happy path)', async () => {
    const res = await mcp.callTool('spending-by-category', {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    });
    expect(res.isError).toBe(false);
    expect(res.text).toContain('Groceries');
  });

  it('monthly-summary returns a report (happy path)', async () => {
    const res = await mcp.callTool('monthly-summary', { months: 3 });
    expect(res.isError).toBe(false);
  });

  it('balance-history returns a report for the Checking account (happy path)', async () => {
    const res = await mcp.callTool('balance-history', { accountId: ctx.ids.accounts['Checking'] });
    expect(res.isError).toBe(false);
  });
});
