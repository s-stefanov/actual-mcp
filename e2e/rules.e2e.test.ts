import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('rules (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('get-rules returns without error (happy path)', async () => {
    const res = await mcp.callTool('get-rules', {});
    expect(res.isError).toBe(false);
  });

  it('create-rule persists and is visible via get-rules (mutation + persistence)', async () => {
    const create = await mcp.callTool('create-rule', {
      // Reason: RuleInputSchema (src/tools/rules/input-schema.ts) enums `stage`
      // as ['pre', 'post', null] — null means "default stage" per its
      // description. The brief's example used the string 'default', which is
      // not a valid enum value and would fail schema validation.
      stage: null,
      conditionsOp: 'and',
      conditions: [{ field: 'payee', op: 'is', value: ctx.ids.payees['Whole Foods'] }],
      actions: [{ field: 'category', op: 'set', value: ctx.ids.categories['Groceries'] }],
    });
    expect(create.isError).toBe(false);

    const read = await mcp.callTool('get-rules', {});
    expect(read.isError).toBe(false);
    // The created rule references the Groceries category id.
    expect(read.text).toContain(ctx.ids.categories['Groceries']);
  });

  it('delete-rule with a missing id returns isError (failure path)', async () => {
    const res = await mcp.callTool('delete-rule', {});
    expect(res.isError).toBe(true);
  });
});
