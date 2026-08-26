import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  getDashboardPages: vi.fn(),
  deleteDashboardPage: vi.fn(),
}));

import { handler } from './index.js';
import { getDashboardPages, deleteDashboardPage } from '../../../actual-api.js';
import { textContent } from '../../../utils/response.js';

const pages = [
  { id: 'page-1', name: 'Default', tombstone: false },
  { id: 'page-2', name: 'Spending Plan', tombstone: false },
];

describe('delete-dashboard-page handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deleteDashboardPage).mockResolvedValue(undefined);
  });

  it('deletes a page when more than one exists', async () => {
    vi.mocked(getDashboardPages).mockResolvedValue(pages);

    const result = await handler({ id: 'page-2' });

    expect(result.isError).toBeUndefined();
    expect(deleteDashboardPage).toHaveBeenCalledWith('page-2');
  });

  it('refuses to delete the only remaining page', async () => {
    vi.mocked(getDashboardPages).mockResolvedValue([pages[0]]);

    const result = await handler({ id: 'page-1' });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('Cannot delete the only dashboard page');
    expect(deleteDashboardPage).not.toHaveBeenCalled();
  });

  it('returns an error for an unknown page id', async () => {
    vi.mocked(getDashboardPages).mockResolvedValue(pages);

    const result = await handler({ id: 'ghost' });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('Dashboard page not found: ghost');
    expect(deleteDashboardPage).not.toHaveBeenCalled();
  });
});
