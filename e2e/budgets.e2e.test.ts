import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('budgets (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('get-budget-months returns a JSON array of month strings (happy path)', async () => {
    // Reason: get-budget-months (src/tools/budgets/get-budget-months/index.ts)
    // takes no args and returns whichever months the budget has ever seen
    // transactions/budget entries for via successWithJson. Rather than assert
    // on a specific seeded month (which depends on internal budget-month
    // bookkeeping we haven't independently verified), assert the tool
    // succeeds and returns a JSON array — the shape the schema promises.
    const res = await mcp.callTool('get-budget-months', {});
    expect(res.isError).toBe(false);
    const months = JSON.parse(res.text) as unknown;
    expect(Array.isArray(months)).toBe(true);
  });

  it('set-budget-amount persists and is visible via get-budget-month (mutation + persistence)', async () => {
    // Reason: set-budget-amount's schema (src/tools/budgets/set-budget-amount/index.ts)
    // takes { month, categoryId, value } where value is integer cents; confirmed
    // by reading the source. Budgets are keyed by month + categoryId, not by
    // name, so no randomUUID token is needed for isolation here.
    const month = '2025-01';
    const categoryId = ctx.ids.categories['Groceries'];
    const value = 15_000; // $150.00

    const set = await mcp.callTool('set-budget-amount', { month, categoryId, value });
    expect(set.isError).toBe(false);

    const read = await mcp.callTool('get-budget-month', { month });
    expect(read.isError).toBe(false);
    expect(read.text).toContain(categoryId);
    expect(read.text).toContain(String(value));
  });

  it('set-budget-amount with a missing categoryId returns isError (failure path)', async () => {
    // Reason: set-budget-amount's handler runs SetBudgetAmountArgsSchema.safeParse
    // and, on failure, returns errorFromCatch(`Invalid arguments: ${parsed.error.message}`)
    // (src/tools/budgets/set-budget-amount/index.ts) — confirmed by reading the
    // source directly, not assumed. Omitting the required `categoryId` field
    // triggers this path deterministically without needing a live server call.
    const res = await mcp.callTool('set-budget-amount', { month: '2025-01', value: 1_000 });
    expect(res.isError).toBe(true);
    expect(res.text).toContain('Invalid arguments');
  });
});
