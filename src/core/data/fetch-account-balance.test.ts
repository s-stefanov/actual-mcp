import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAccountBalanceAsOf } from './fetch-account-balance.js';

vi.mock('../../actual-api.js', () => ({
  getAccountBalance: vi.fn(),
}));

import { getAccountBalance } from '../../actual-api.js';

describe('fetchAccountBalanceAsOf', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('passes the requested cutoff through the facade', async () => {
    const cutoff = new Date('2026-02-28T12:00:00Z');
    vi.mocked(getAccountBalance).mockResolvedValue(12345);

    await expect(fetchAccountBalanceAsOf('a1', cutoff)).resolves.toBe(12345);

    expect(getAccountBalance).toHaveBeenCalledWith('a1', cutoff);
  });

  it('uses today when no cutoff is supplied', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T10:00:00Z'));
    vi.mocked(getAccountBalance).mockResolvedValue(12345);

    await fetchAccountBalanceAsOf('a1');

    expect(getAccountBalance).toHaveBeenCalledWith('a1', new Date('2026-09-12T10:00:00Z'));
  });

  it('propagates balance lookup failures', async () => {
    vi.mocked(getAccountBalance).mockRejectedValue(new Error('balance failed'));

    await expect(fetchAccountBalanceAsOf('a1')).rejects.toThrow('balance failed');
  });
});
