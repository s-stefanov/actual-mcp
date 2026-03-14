import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPayeeRules } from './fetch-payee-rules.js';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getPayeeRules: vi.fn(),
}));

import { getPayeeRules } from '../../actual-api.js';

describe('fetchPayeeRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return rules for a payee from API', async () => {
    const payeeId = 'payee-123';
    const mockRules = [
      { id: 'rule-1', stage: null, conditionsOp: 'and', conditions: [], actions: [] },
      { id: 'rule-2', stage: 'pre', conditionsOp: 'and', conditions: [], actions: [] },
    ];
    vi.mocked(getPayeeRules).mockResolvedValue(mockRules as never);

    const result = await fetchPayeeRules(payeeId);

    expect(result).toEqual(mockRules);
    expect(getPayeeRules).toHaveBeenCalledWith(payeeId);
    expect(getPayeeRules).toHaveBeenCalledOnce();
  });

  it('should handle API errors', async () => {
    vi.mocked(getPayeeRules).mockRejectedValue(new Error('API Error'));

    await expect(fetchPayeeRules('payee-123')).rejects.toThrow('API Error');
    expect(getPayeeRules).toHaveBeenCalledOnce();
  });

  it('should handle empty response', async () => {
    vi.mocked(getPayeeRules).mockResolvedValue([]);

    const result = await fetchPayeeRules('payee-123');

    expect(result).toEqual([]);
    expect(getPayeeRules).toHaveBeenCalledWith('payee-123');
  });
});
