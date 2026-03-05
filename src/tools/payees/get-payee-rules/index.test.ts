import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../core/data/fetch-payee-rules.js', () => ({
  fetchPayeeRules: vi.fn(),
}));

import { schema, handler } from './index.js';
import { fetchPayeeRules } from '../../../core/data/fetch-payee-rules.js';

describe('get-payee-rules tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct schema name and require payeeId', () => {
    expect(schema.name).toBe('get-payee-rules');
    expect(schema.inputSchema.required).toContain('payeeId');
  });

  it('should return rules for a valid payeeId', async () => {
    const mockRules = [{ id: 'rule-1', stage: null, conditionsOp: 'and', conditions: [], actions: [] }];
    vi.mocked(fetchPayeeRules).mockResolvedValue(mockRules as never);

    const result = await handler({ payeeId: 'payee-123' });

    expect(result).toMatchObject({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('rule-1'),
        },
      ],
    });
    expect(fetchPayeeRules).toHaveBeenCalledWith('payee-123');
    expect(fetchPayeeRules).toHaveBeenCalledOnce();
  });

  it('should return error when payeeId is missing', async () => {
    const result = await handler({} as never);

    expect(result).toMatchObject({
      isError: true,
    });
    expect(fetchPayeeRules).not.toHaveBeenCalled();
  });

  it('should return error response on API failure', async () => {
    vi.mocked(fetchPayeeRules).mockRejectedValue(new Error('API failure'));

    const result = await handler({ payeeId: 'payee-123' });

    expect(result).toMatchObject({
      isError: true,
    });
  });
});
