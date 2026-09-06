import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@actual-app/api', () => ({
  init: vi.fn(),
  getBudgets: vi.fn(),
  downloadBudget: vi.fn(),
  sync: vi.fn(),
  shutdown: vi.fn(),
  getAccounts: vi.fn(),
  getAccountBalance: vi.fn(),
}));

import * as api from '@actual-app/api';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../server.js';
import { resetActualConnectionForTests } from './connection.js';

describe('overlapping tool calls over MCP', () => {
  let dataDir: string;

  beforeEach(() => {
    resetActualConnectionForTests();
    vi.resetAllMocks();
    vi.mocked(api.getBudgets).mockResolvedValue([{ id: 'budget-1', cloudFileId: 'cloud-1' }] as never);
    vi.mocked(api.downloadBudget).mockResolvedValue(undefined as never);
    vi.mocked(api.sync).mockResolvedValue(undefined as never);
    vi.mocked(api.getAccounts).mockResolvedValue([
      { id: 'a1', name: 'Checking', offbudget: false, closed: false },
    ] as never);
    vi.mocked(api.getAccountBalance).mockResolvedValue(1000 as never);

    dataDir = mkdtempSync(join(tmpdir(), 'actual-mcp-integration-'));
    vi.stubEnv('ACTUAL_DATA_DIR', dataDir);
    vi.stubEnv('ACTUAL_SERVER_URL', 'https://example.invalid');
    vi.stubEnv('ACTUAL_PASSWORD', 'secret');
    vi.stubEnv('ACTUAL_BUDGET_SYNC_ID', 'cloud-1');
    vi.stubEnv('ACTUAL_BUDGET_ENCRYPTION_PASSWORD', undefined);
    vi.stubEnv('ACTUAL_SYNC_TTL_MS', '-1');
  });

  afterEach(() => {
    resetActualConnectionForTests();
    vi.unstubAllEnvs();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('both overlapping get-accounts calls succeed with a single api.init', async () => {
    let releaseInit!: () => void;
    const initGate = new Promise<void>((resolve) => {
      releaseInit = resolve;
    });
    vi.mocked(api.init).mockReturnValue(initGate as never);

    const server = createServer({ enableWrite: false });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '1.0.0' });
    let calls: ReturnType<Client['callTool']>[] = [];

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      let receivedToolCalls = 0;
      const onmessage = serverTransport.onmessage;
      serverTransport.onmessage = (message, extra): void => {
        onmessage?.(message, extra);
        if ('method' in message && message.method === 'tools/call') {
          receivedToolCalls += 1;
        }
      };

      calls = [
        client.callTool({ name: 'get-accounts', arguments: {} }),
        client.callTool({ name: 'get-accounts', arguments: {} }),
      ];

      // Reason: both requests must reach the real server while initialization is still pending.
      await vi.waitFor(() => {
        expect(receivedToolCalls).toBe(2);
        expect(api.init).toHaveBeenCalled();
      });
      expect(api.getAccounts).not.toHaveBeenCalled();
      expect(api.init).toHaveBeenCalledTimes(1);

      releaseInit();
      const results = await Promise.all(calls);
      for (const result of results) {
        expect(result.isError).toBeFalsy();
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: '[{"id":"a1","name":"Checking","type":"Account","balance":"$10.00","closed":false,"offBudget":false}]',
            },
          ],
        });
      }
      expect(api.init).toHaveBeenCalledTimes(1);
      expect(api.getAccounts).toHaveBeenCalledTimes(2);
    } finally {
      releaseInit();
      await Promise.allSettled(calls);
      await client.close();
      await server.close();
    }
  });
});
