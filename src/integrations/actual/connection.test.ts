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

/** A promise whose resolve/reject are exposed, for deterministic ordering control. */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('ActualConnection.ensureReady', () => {
  beforeEach(() => {
    resetActualConnectionForTests();
    vi.clearAllMocks();
    vi.mocked(api.init).mockResolvedValue(undefined as never);
    vi.mocked(api.getBudgets).mockResolvedValue([{ id: 'budget-1', cloudFileId: 'cloud-1' }] as never);
    vi.mocked(api.downloadBudget).mockResolvedValue(undefined as never);
    process.env.ACTUAL_SERVER_URL = 'https://example.invalid';
    process.env.ACTUAL_PASSWORD = 'secret';
    delete process.env.ACTUAL_SYNC_TTL_MS;
  });

  afterEach(() => {
    resetActualConnectionForTests();
  });

  it('calls api.init exactly once for concurrent ensureReady callers', async () => {
    const conn = getActualConnection();
    await Promise.all([conn.ensureReady(), conn.ensureReady(), conn.ensureReady()]);
    expect(api.init).toHaveBeenCalledTimes(1);
    expect(api.downloadBudget).toHaveBeenCalledTimes(1);
  });

  it('does not sticky-cache a failed init: first waiters reject, a later call succeeds', async () => {
    const first = deferred<void>();
    vi.mocked(api.init).mockReturnValueOnce(first.promise as never);
    const conn = getActualConnection();

    const failing = conn.ensureReady();
    first.reject(new Error('init boom'));
    await expect(failing).rejects.toThrow('init boom');

    // api.init resolves normally on the retry (default mockResolvedValue).
    await expect(conn.ensureReady()).resolves.toBeUndefined();
    expect(api.init).toHaveBeenCalledTimes(2);
  });
});

describe('ActualConnection sync-if-stale', () => {
  beforeEach(() => {
    resetActualConnectionForTests();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(api.init).mockResolvedValue(undefined as never);
    vi.mocked(api.getBudgets).mockResolvedValue([{ id: 'budget-1', cloudFileId: 'cloud-1' }] as never);
    vi.mocked(api.downloadBudget).mockResolvedValue(undefined as never);
    vi.mocked(api.sync).mockResolvedValue(undefined as never);
    process.env.ACTUAL_SERVER_URL = 'https://example.invalid';
    process.env.ACTUAL_PASSWORD = 'secret';
    delete process.env.ACTUAL_SYNC_TTL_MS;
  });

  afterEach(() => {
    vi.useRealTimers();
    resetActualConnectionForTests();
  });

  it('does not sync on the first call after init', async () => {
    await getActualConnection().ensureReady();
    expect(api.sync).not.toHaveBeenCalled();
  });

  it('concurrent stale reads share a single sync', async () => {
    const pending = deferred<void>();
    vi.mocked(api.sync).mockReturnValueOnce(pending.promise as never);
    const conn = getActualConnection();

    await conn.ensureReady(); // becomes ready, seeds lastSyncAt
    vi.advanceTimersByTime(61_000); // now stale

    const a = conn.ensureReady();
    const b = conn.ensureReady();
    pending.resolve();
    await Promise.all([a, b]);

    expect(api.sync).toHaveBeenCalledTimes(1);
  });

  it('never syncs when ACTUAL_SYNC_TTL_MS is negative', async () => {
    process.env.ACTUAL_SYNC_TTL_MS = '-1';
    const conn = getActualConnection();
    await conn.ensureReady();
    vi.advanceTimersByTime(600_000);
    await conn.ensureReady();
    expect(api.sync).not.toHaveBeenCalled();
  });

  it('keeps serving when a sync fails', async () => {
    const conn = getActualConnection();
    await conn.ensureReady();
    vi.mocked(api.sync).mockRejectedValueOnce(new Error('server unreachable'));
    vi.advanceTimersByTime(61_000);
    await expect(conn.ensureReady()).resolves.toBeUndefined();
  });
});

describe('ActualConnection.run', () => {
  beforeEach(() => {
    resetActualConnectionForTests();
    vi.clearAllMocks();
    vi.mocked(api.init).mockResolvedValue(undefined as never);
    vi.mocked(api.getBudgets).mockResolvedValue([{ id: 'budget-1', cloudFileId: 'cloud-1' }] as never);
    vi.mocked(api.downloadBudget).mockResolvedValue(undefined as never);
    process.env.ACTUAL_SERVER_URL = 'https://example.invalid';
    process.env.ACTUAL_PASSWORD = 'secret';
    delete process.env.ACTUAL_SYNC_TTL_MS;
  });

  afterEach(() => resetActualConnectionForTests());

  it('serializes operations: the second starts only after the first finishes', async () => {
    const conn = getActualConnection();
    const events: string[] = [];
    const first = deferred<void>();
    const firstStarted = deferred<void>();

    const p1 = conn.run(async () => {
      events.push('start-1');
      firstStarted.resolve();
      await first.promise;
      events.push('end-1');
    });
    const p2 = conn.run(async () => {
      events.push('start-2');
    });

    await firstStarted.promise;
    expect(events).toEqual(['start-1']);

    first.resolve();
    await Promise.all([p1, p2]);
    expect(events).toEqual(['start-1', 'end-1', 'start-2']);
  });

  it('initializes exactly once across overlapping operations', async () => {
    const conn = getActualConnection();
    await Promise.all([conn.run(async () => 'a'), conn.run(async () => 'b')]);
    expect(api.init).toHaveBeenCalledTimes(1);
  });

  it('propagates operation results and errors without breaking the queue', async () => {
    const conn = getActualConnection();
    await expect(conn.run(async () => 42)).resolves.toBe(42);
    await expect(conn.run(async () => Promise.reject(new Error('op boom')))).rejects.toThrow('op boom');
    await expect(conn.run(async () => 'ok')).resolves.toBe('ok');
  });
});

describe('ActualConnection.drainAndClose', () => {
  beforeEach(() => {
    resetActualConnectionForTests();
    vi.clearAllMocks();
    vi.mocked(api.init).mockResolvedValue(undefined as never);
    vi.mocked(api.getBudgets).mockResolvedValue([{ id: 'budget-1', cloudFileId: 'cloud-1' }] as never);
    vi.mocked(api.downloadBudget).mockResolvedValue(undefined as never);
    vi.mocked(api.shutdown).mockResolvedValue(undefined as never);
    process.env.ACTUAL_SERVER_URL = 'https://example.invalid';
    process.env.ACTUAL_PASSWORD = 'secret';
    delete process.env.ACTUAL_SYNC_TTL_MS;
  });

  afterEach(() => resetActualConnectionForTests());

  it('awaits an in-flight operation before calling api.shutdown', async () => {
    const conn = getActualConnection();
    const gate = deferred<void>();
    const opStarted = deferred<void>();
    let opFinished = false;

    const opPromise = conn.run(async () => {
      opStarted.resolve();
      await gate.promise;
      opFinished = true;
    });

    await opStarted.promise;
    const closePromise = conn.drainAndClose();
    // shutdown must not happen while the op is still running.
    await Promise.resolve();
    expect(api.shutdown).not.toHaveBeenCalled();
    expect(opFinished).toBe(false);

    gate.resolve();
    await opPromise;
    await closePromise;
    expect(opFinished).toBe(true);
    expect(api.shutdown).toHaveBeenCalledTimes(1);
  });

  it('waits for direct in-flight initialization before shutting down', async () => {
    const initGate = deferred<void>();
    vi.mocked(api.init).mockReturnValueOnce(initGate.promise as never);
    const conn = getActualConnection();

    const readyPromise = conn.ensureReady();
    const closePromise = conn.drainAndClose();
    await Promise.resolve();
    expect(api.shutdown).not.toHaveBeenCalled();

    initGate.resolve();
    await readyPromise;
    await closePromise;
    expect(api.shutdown).toHaveBeenCalledTimes(1);
  });

  it('waits for direct in-flight synchronization before shutting down', async () => {
    const conn = getActualConnection();
    await conn.ensureReady();
    const syncGate = deferred<void>();
    process.env.ACTUAL_SYNC_TTL_MS = '0';
    vi.mocked(api.sync).mockReturnValueOnce(syncGate.promise as never);

    const syncPromise = conn.ensureReady();
    const closePromise = conn.drainAndClose();
    await Promise.resolve();
    expect(api.shutdown).not.toHaveBeenCalled();

    syncGate.resolve();
    await syncPromise;
    await closePromise;
    expect(api.shutdown).toHaveBeenCalledTimes(1);
  });

  it('rejects operations submitted after close', async () => {
    const conn = getActualConnection();
    await conn.ensureReady();
    await conn.drainAndClose();
    await expect(conn.run(async () => 'nope')).rejects.toThrow(/closed/);
    await expect(conn.ensureReady()).rejects.toThrow(/closed/);
  });

  it('is idempotent and shuts down exactly once', async () => {
    const conn = getActualConnection();
    await conn.ensureReady();
    await Promise.all([conn.drainAndClose(), conn.drainAndClose()]);
    expect(api.shutdown).toHaveBeenCalledTimes(1);
  });

  it('closes cleanly when never initialized (no api.shutdown)', async () => {
    const conn = getActualConnection();
    await conn.drainAndClose();
    expect(api.shutdown).not.toHaveBeenCalled();
  });

  it('logs a shutdown failure and still reaches the closed state', async () => {
    const conn = getActualConnection();
    await conn.ensureReady();
    const shutdownError = new Error('shutdown boom');
    vi.mocked(api.shutdown).mockRejectedValueOnce(shutdownError as never);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await expect(conn.drainAndClose()).resolves.toBeUndefined();
      expect(consoleError).toHaveBeenCalledWith('Error shutting down Actual Budget API:', shutdownError);
      expect((conn as unknown as { state: string }).state).toBe('closed');
      await expect(conn.ensureReady()).rejects.toThrow(/closed/);
    } finally {
      consoleError.mockRestore();
    }
  });
});
