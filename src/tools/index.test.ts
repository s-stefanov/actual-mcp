import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initActualApi, shutdownActualApi } from '../actual-api.js';
import { setupTools } from './index.js';

vi.mock('../actual-api.js', () => ({
  initActualApi: vi.fn(),
  shutdownActualApi: vi.fn(),
}));

type RequestHandler = (request: { params: { name: string; arguments?: Record<string, unknown> } }) => unknown;

function captureHandlers(enableWrite: boolean, allowedTools?: readonly string[]): RequestHandler[] {
  const handlers: RequestHandler[] = [];
  const server = {
    setRequestHandler: vi.fn((_schema: unknown, handler: RequestHandler) => {
      handlers.push(handler);
    }),
  };

  setupTools(server as unknown as Server, enableWrite, allowedTools);
  return handlers;
}

describe('tool allowlisting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the exact same allowlisted set to list and call', async () => {
    const [listTools, callTool] = captureHandlers(true, ['get-accounts', 'create-transaction']);
    const listed = (await listTools({ params: { name: '' } })) as {
      tools: Array<{ name: string }>;
    };

    expect(listed.tools.map(({ name }) => name)).toEqual(['get-accounts', 'create-transaction']);

    const denied = (await callTool({ params: { name: 'get-transactions', arguments: {} } })) as {
      content: Array<{ text: string }>;
    };
    expect(denied.content[0].text).toContain('Unknown tool get-transactions');
    expect(initActualApi).not.toHaveBeenCalled();
    expect(shutdownActualApi).not.toHaveBeenCalled();

    await callTool({ params: { name: 'create-transaction', arguments: {} } });
    expect(initActualApi).toHaveBeenCalledOnce();
    expect(shutdownActualApi).toHaveBeenCalledOnce();
  });

  it('fails closed when a write tool is allowlisted without write access', () => {
    expect(() => captureHandlers(false, ['create-transaction'])).toThrow(
      'Write tool(s) require --enable-write: create-transaction'
    );
    expect(initActualApi).not.toHaveBeenCalled();
    expect(shutdownActualApi).not.toHaveBeenCalled();
  });

  it('rejects unknown allowlist names during setup', () => {
    expect(() => captureHandlers(true, ['get-accounts', 'not-a-tool'])).toThrow(
      'Unknown tool name(s) in allowlist: not-a-tool'
    );
  });

  it('keeps all existing tools available when the allowlist is unset', async () => {
    const [listTools] = captureHandlers(true);
    const listed = (await listTools({ params: { name: '' } })) as {
      tools: Array<{ name: string }>;
    };
    const names = listed.tools.map(({ name }) => name);

    expect(names).toContain('create-transaction');
    expect(names).toContain('delete-transaction');
    expect(names).toContain('import-transactions');
    expect(names).toContain('get-receipts');
    expect(names).toContain('record-receipt');
    expect(names).toContain('update-receipt');
  });

  it('registers receipt permissions and dispatches receipt tools without Actual initialization', async () => {
    const [readList, readCall] = captureHandlers(false, ['get-receipts']);
    const listed = (await readList({ params: { name: '' } })) as { tools: Array<{ name: string }> };
    expect(listed.tools.map(({ name }) => name)).toEqual(['get-receipts']);

    await readCall({ params: { name: 'get-receipts', arguments: {} } });
    expect(initActualApi).not.toHaveBeenCalled();
    expect(shutdownActualApi).not.toHaveBeenCalled();

    expect(() => captureHandlers(false, ['record-receipt'])).toThrow(
      'Write tool(s) require --enable-write: record-receipt'
    );
    const [, writeCall] = captureHandlers(true, ['record-receipt']);
    await writeCall({ params: { name: 'record-receipt', arguments: {} } });
    expect(initActualApi).not.toHaveBeenCalled();
    expect(shutdownActualApi).not.toHaveBeenCalled();

    const [, updateCall] = captureHandlers(true, ['update-receipt']);
    await updateCall({ params: { name: 'update-receipt', arguments: {} } });
    expect(initActualApi).not.toHaveBeenCalled();
    expect(shutdownActualApi).not.toHaveBeenCalled();
  });

  it('always shuts Actual down when an existing Actual-backed tool handler fails', async () => {
    const [, callTool] = captureHandlers(true, ['get-accounts']);
    await callTool({ params: { name: 'get-accounts', arguments: { unexpected: true } } });

    expect(initActualApi).toHaveBeenCalledOnce();
    expect(shutdownActualApi).toHaveBeenCalledOnce();
  });
});
