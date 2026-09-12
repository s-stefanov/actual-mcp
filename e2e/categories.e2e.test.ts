import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMcpClient, type McpClientHandle } from './helpers/mcp-client.js';

const ctx = inject('e2e');

describe.skipIf(!ctx.syncId)('categories (e2e)', () => {
  let mcp: McpClientHandle;

  beforeAll(async () => {
    mcp = await createMcpClient(ctx);
  });

  afterAll(async () => {
    await mcp?.close();
  });

  it('get-grouped-categories returns the seeded groups (happy path, JSON)', async () => {
    const res = await mcp.callTool('get-grouped-categories', {});
    expect(res.isError).toBe(false);
    expect(res.text).toContain('Groceries');
    expect(res.text).toContain('Everyday');
  });

  it('create-category persists and is visible via get-grouped-categories (mutation + persistence)', async () => {
    const token = `E2E ${randomUUID()}`;
    const create = await mcp.callTool('create-category', {
      // Reason: create-category's real schema names the group field `groupId`
      // (camelCase) — confirmed in src/tools/categories/create-category/index.ts.
      // The brief's example used `group_id`, which does not match the source.
      name: token,
      groupId: ctx.ids.categoryGroups['Everyday'],
    });
    expect(create.isError).toBe(false);

    const read = await mcp.callTool('get-grouped-categories', {});
    expect(read.isError).toBe(false);
    expect(read.text).toContain(token);
  });

  it('delete-category with a bogus id returns isError (failure path)', async () => {
    // Reason: confirmed by reading the installed @actual-app/api bundle
    // (node_modules/@actual-app/api/dist/index.js, deleteCategory$1) that the
    // underlying "category-delete" handler does a SELECT for the row first
    // and throws `Category with id ${id} not found.` when it's missing — it
    // does not silently no-op. src/tools/categories/delete-category/index.ts
    // wraps that thrown error via errorFromCatch, which sets isError: true
    // and prefixes the message with "Error: ".
    const res = await mcp.callTool('delete-category', { id: 'does-not-exist-00000000' });
    expect(res.isError).toBe(true);
    expect(res.text).toContain('not found');
  });
});
