import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@actual-app/api', () => ({
  init: vi.fn(),
  getBudgets: vi.fn(),
  downloadBudget: vi.fn(),
  sync: vi.fn(),
  shutdown: vi.fn(),
}));

import * as api from '@actual-app/api';
import { getActualConnection, resetActualConnectionForTests } from './connection.js';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('ActualConnection lifecycle ordering', () => {
  let dataDir: string;

  beforeEach(() => {
    resetActualConnectionForTests();
    vi.resetAllMocks();
    vi.mocked(api.init).mockResolvedValue(undefined as never);
    vi.mocked(api.getBudgets).mockResolvedValue([{ id: 'budget-1', cloudFileId: 'cloud-1' }] as never);
    vi.mocked(api.downloadBudget).mockResolvedValue(undefined as never);
    vi.mocked(api.sync).mockResolvedValue(undefined as never);
    vi.mocked(api.shutdown).mockResolvedValue(undefined as never);

    dataDir = mkdtempSync(join(tmpdir(), 'actual-mcp-concurrency-'));
    vi.stubEnv('ACTUAL_DATA_DIR', dataDir);
    vi.stubEnv('ACTUAL_SERVER_URL', 'https://example.invalid');
    vi.stubEnv('ACTUAL_PASSWORD', 'secret');
    vi.stubEnv('ACTUAL_BUDGET_SYNC_ID', 'cloud-1');
    vi.stubEnv('ACTUAL_BUDGET_ENCRYPTION_PASSWORD', undefined);
    vi.stubEnv('ACTUAL_SYNC_TTL_MS', undefined);
  });

  afterEach(() => {
    resetActualConnectionForTests();
    vi.unstubAllEnvs();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it.each(['initialization', 'ready', 'sync'] as const)(
    'drains work accepted immediately before close during %s',
    async (phase) => {
      const conn = getActualConnection();
      const readinessGate = deferred();
      const operationGate = deferred();
      const operationStarted = deferred();
      const events: string[] = [];

      if (phase === 'initialization') {
        vi.mocked(api.init).mockReturnValueOnce(readinessGate.promise as never);
      } else {
        await conn.ensureReady();
        if (phase === 'sync') {
          vi.stubEnv('ACTUAL_SYNC_TTL_MS', '0');
          vi.mocked(api.sync).mockReturnValueOnce(readinessGate.promise as never);
        }
      }
      vi.mocked(api.shutdown).mockImplementation(async () => {
        events.push('shutdown');
      });

      const operation = conn.run(async () => {
        events.push('operation:start');
        operationStarted.resolve();
        await operationGate.promise;
        events.push('operation:end');
        return 'accepted result';
      });
      // Reason: close must include accepted work even before readiness yields to the queue.
      const close = conn.drainAndClose();

      try {
        await expect(conn.run(async () => 'too late')).rejects.toThrow(/closed/);
        await expect(conn.ensureReady()).rejects.toThrow(/closed/);
        if (phase !== 'ready') {
          await setImmediate();
          expect(events).toEqual([]);
        }

        readinessGate.resolve();
        await operationStarted.promise;
        // Let every runnable promise continuation settle while the operation stays blocked.
        await setImmediate();
        expect(events).toEqual(['operation:start']);
        expect(api.shutdown).not.toHaveBeenCalled();
      } finally {
        readinessGate.resolve();
        operationGate.resolve();
        await Promise.allSettled([operation, close]);
      }

      await expect(operation).resolves.toBe('accepted result');
      expect(events).toEqual(['operation:start', 'operation:end', 'shutdown']);
      expect(api.shutdown).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['run', 'ensureReady'] as const)(
    'queues stale sync requested by %s behind an active operation and shares it with other callers',
    async (caller) => {
      const conn = getActualConnection();
      await conn.ensureReady();
      vi.stubEnv('ACTUAL_SYNC_TTL_MS', '0');
      const operationGate = deferred();
      const operationStarted = deferred();
      const syncGate = deferred();
      const syncStarted = deferred();
      const events: string[] = [];
      vi.mocked(api.sync)
        .mockImplementationOnce(async () => {
          events.push('first-sync');
        })
        .mockImplementation(async () => {
          events.push('sync:start');
          syncStarted.resolve();
          await syncGate.promise;
          events.push('sync:end');
        });

      const first = conn.run(async () => {
        events.push('operation:start');
        operationStarted.resolve();
        await operationGate.promise;
        events.push('operation:end');
      });
      const pending: Promise<unknown>[] = [first];

      try {
        await operationStarted.promise;
        pending.push(
          caller === 'run'
            ? conn.run(async () => {
                events.push('second-operation');
              })
            : conn.ensureReady(),
          conn.ensureReady()
        );

        await setImmediate();
        expect(events).toEqual(['first-sync', 'operation:start']);
        expect(api.sync).toHaveBeenCalledTimes(1);

        operationGate.resolve();
        await syncStarted.promise;
        pending.push(conn.ensureReady());
        await setImmediate();
        expect(events).toEqual(['first-sync', 'operation:start', 'operation:end', 'sync:start']);
        expect(api.sync).toHaveBeenCalledTimes(2);

        syncGate.resolve();
        await Promise.all(pending);
        expect(events).toEqual([
          'first-sync',
          'operation:start',
          'operation:end',
          'sync:start',
          'sync:end',
          ...(caller === 'run' ? ['second-operation'] : []),
        ]);
      } finally {
        operationGate.resolve();
        syncGate.resolve();
        await Promise.allSettled(pending);
      }
    }
  );
});
