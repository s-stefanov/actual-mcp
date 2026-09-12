import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('accounts + transactions (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('get-accounts returns the seeded accounts (happy path, JSON)', async () => {
    const res = await mcp.callTool('get-accounts', {});
    expect(res.isError).toBe(false);
    const accounts = JSON.parse(res.text) as Array<{ id: string; name: string }>;
    const names = accounts.map((a) => a.name);
    expect(names).toContain('Checking');
    expect(names).toContain('Savings');
  });

  it('get-transactions returns seeded transactions (happy path, Markdown)', async () => {
    const res = await mcp.callTool('get-transactions', {
      accountId: ctx.ids.accounts['Checking'],
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    });
    expect(res.isError).toBe(false);
    expect(res.text).toContain('Whole Foods');
  });

  it('get-transactions with a missing accountId returns isError (failure path)', async () => {
    const res = await mcp.callTool('get-transactions', {});
    expect(res.isError).toBe(true);
    expect(res.text).toContain('accountId is required');
  });

  it('create-transaction persists and is visible via get-transactions (mutation + persistence)', async () => {
    const token = `E2E ${randomUUID()}`;
    const create = await mcp.callTool('create-transaction', {
      // Reason: create-transaction's real schema (CreateTransactionArgsSchema) names
      // the account field `account`, not `accountId` — confirmed in
      // src/tools/create-transaction/index.ts / src/types.ts. Amount is an integer
      // in cents (no decimal places), e.g. -1234 == -$12.34.
      account: ctx.ids.accounts['Checking'],
      amount: -1234,
      date: '2025-02-10',
      payee_name: token,
      notes: token,
    });
    expect(create.isError).toBe(false);

    const read = await mcp.callTool('get-transactions', {
      accountId: ctx.ids.accounts['Checking'],
      startDate: '2025-02-01',
      endDate: '2025-02-28',
    });
    expect(read.isError).toBe(false);
    expect(read.text).toContain(token);
  });
});
