import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('payees (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('get-payees returns the seeded payees (happy path)', async () => {
    const res = await mcp.callTool('get-payees', {});
    expect(res.isError).toBe(false);
    expect(res.text).toContain('Whole Foods');
  });

  it('create-payee persists and is visible via get-payees (mutation + persistence)', async () => {
    // Reason: create-payee's schema (src/tools/payees/create-payee/index.ts)
    // takes `name` (required) and an optional `transferAccount`; confirmed
    // matching the brief's example verbatim.
    const token = `E2E ${randomUUID()}`;
    const create = await mcp.callTool('create-payee', { name: token });
    expect(create.isError).toBe(false);

    const read = await mcp.callTool('get-payees', {});
    expect(read.isError).toBe(false);
    expect(read.text).toContain(token);
  });

  it('update-payee with a missing id returns isError (failure path)', async () => {
    // Reason: update-payee's schema (src/tools/payees/update-payee/index.ts)
    // requires `id`; the handler explicitly checks
    // `if (!args.id || typeof args.id !== 'string')` and returns
    // errorFromCatch('id is required and must be a string') before ever
    // calling the underlying API, so omitting `id` deterministically
    // produces isError: true without needing a live server round-trip.
    const res = await mcp.callTool('update-payee', { name: 'no-id-supplied' });
    expect(res.isError).toBe(true);
    expect(res.text).toContain('id is required');
  });
});
