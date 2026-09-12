import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  createReport: vi.fn(),
}));

import { handler } from './index.js';
import { createReport } from '../../../actual-api.js';
import { textContent } from '../../../utils/response.js';

describe('create-custom-report handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the report through and returns the new id', async () => {
    vi.mocked(createReport).mockResolvedValue('new-id');

    const args = { name: 'Groceries', conditionsOp: 'and', mode: 'time' };
    const result = await handler(args);

    expect(result.isError).toBeUndefined();
    expect(createReport).toHaveBeenCalledWith(args);
    expect(textContent(result.content[0])).toContain('new-id');
  });

  it('surfaces a duplicate-name rejection as a tool error', async () => {
    vi.mocked(createReport).mockRejectedValue(new Error('There is already a report named Groceries'));

    const result = await handler({ name: 'Groceries', conditionsOp: 'and' });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('already a report named Groceries');
  });

  it('surfaces a missing-name rejection from the server', async () => {
    vi.mocked(createReport).mockRejectedValue(new Error('Report name is required'));

    const result = await handler({ conditionsOp: 'and' });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('Report name is required');
  });
});
