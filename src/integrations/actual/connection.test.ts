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
