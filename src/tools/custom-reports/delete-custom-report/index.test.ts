import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  deleteReport: vi.fn(),
}));

import { handler } from './index.js';
import { deleteReport } from '../../../actual-api.js';
import { textContent } from '../../../utils/response.js';

describe('delete-custom-report handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deleteReport).mockResolvedValue(undefined);
  });

  it('deletes by id', async () => {
    const result = await handler({ id: 'r1' });

    expect(result.isError).toBeUndefined();
    expect(deleteReport).toHaveBeenCalledWith('r1');
  });

  it('requires an id', async () => {
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('id is required');
    expect(deleteReport).not.toHaveBeenCalled();
  });

  it('surfaces an API failure', async () => {
    vi.mocked(deleteReport).mockRejectedValue(new Error('API Error'));

    const result = await handler({ id: 'r1' });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('API Error');
  });
});
