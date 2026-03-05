import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCommonPayees } from './fetch-common-payees.js';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getCommonPayees: vi.fn(),
}));

import { getCommonPayees } from '../../actual-api.js';

describe('fetchCommonPayees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return common payees from API', async () => {
    const mockPayees = [
      { id: '1', name: 'Grocery Store', transfer_acct: null },
      { id: '2', name: 'Gas Station', transfer_acct: null },
    ];
    vi.mocked(getCommonPayees).mockResolvedValue(mockPayees as never);

    const result = await fetchCommonPayees();

    expect(result).toEqual(mockPayees);
    expect(getCommonPayees).toHaveBeenCalledOnce();
  });

  it('should handle API errors', async () => {
    vi.mocked(getCommonPayees).mockRejectedValue(new Error('API Error'));

    await expect(fetchCommonPayees()).rejects.toThrow('API Error');
    expect(getCommonPayees).toHaveBeenCalledOnce();
  });

  it('should handle empty response', async () => {
    vi.mocked(getCommonPayees).mockResolvedValue([]);

    const result = await fetchCommonPayees();

    expect(result).toEqual([]);
    expect(getCommonPayees).toHaveBeenCalledOnce();
  });
});
