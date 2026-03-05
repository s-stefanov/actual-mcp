import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../core/data/fetch-common-payees.js', () => ({
  fetchCommonPayees: vi.fn(),
}));

import { schema, handler } from './index.js';
import { fetchCommonPayees } from '../../../core/data/fetch-common-payees.js';

describe('get-common-payees tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct schema name', () => {
    expect(schema.name).toBe('get-common-payees');
  });

  it('should return structured payees on happy path', async () => {
    const mockPayees = [
      { id: '1', name: 'Grocery Store', transfer_acct: null },
      { id: '2', name: 'Gas Station', transfer_acct: 'acct-123' },
    ];
    vi.mocked(fetchCommonPayees).mockResolvedValue(mockPayees as never);

    const result = await handler();

    expect(result).toMatchObject({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Grocery Store'),
        },
      ],
    });
    expect(fetchCommonPayees).toHaveBeenCalledOnce();
  });

  it('should return error response on failure', async () => {
    vi.mocked(fetchCommonPayees).mockRejectedValue(new Error('API failure'));

    const result = await handler();

    expect(result).toMatchObject({
      isError: true,
    });
  });
});
