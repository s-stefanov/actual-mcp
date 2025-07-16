import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllCategories, fetchAllCategoryGroups } from './fetch-categories.js';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getCategories: vi.fn(),
  getCategoryGroups: vi.fn(),
}));

import { getCategories, getCategoryGroups } from '../../actual-api.js';

describe('fetchAllCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return categories from API', async () => {
    const mockCategories = [
      { id: '1', name: 'Food', group_id: 'g1' },
      { id: '2', name: 'Transport', group_id: 'g2' },
    ];
    vi.mocked(getCategories).mockResolvedValue(mockCategories);

    const result = await fetchAllCategories();

    expect(result).toEqual(mockCategories);
    expect(getCategories).toHaveBeenCalledOnce();
  });

  it('should handle API errors', async () => {
    vi.mocked(getCategories).mockRejectedValue(new Error('Categories API Error'));

    await expect(fetchAllCategories()).rejects.toThrow('Categories API Error');
    expect(getCategories).toHaveBeenCalledOnce();
  });

  it('should handle empty response', async () => {
    vi.mocked(getCategories).mockResolvedValue([]);

    const result = await fetchAllCategories();

    expect(result).toEqual([]);
    expect(getCategories).toHaveBeenCalledOnce();
  });
});

describe('fetchAllCategoryGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return category groups from API', async () => {
    const mockCategoryGroups = [
      { id: 'g1', name: 'Living', is_income: false },
      { id: 'g2', name: 'Income', is_income: true },
    ];
    vi.mocked(getCategoryGroups).mockResolvedValue(mockCategoryGroups);

    const result = await fetchAllCategoryGroups();

    expect(result).toEqual(mockCategoryGroups);
    expect(getCategoryGroups).toHaveBeenCalledOnce();
  });

  it('should handle API errors', async () => {
    vi.mocked(getCategoryGroups).mockRejectedValue(new Error('Category Groups API Error'));

    await expect(fetchAllCategoryGroups()).rejects.toThrow('Category Groups API Error');
    expect(getCategoryGroups).toHaveBeenCalledOnce();
  });

  it('should handle empty response', async () => {
    vi.mocked(getCategoryGroups).mockResolvedValue([]);

    const result = await fetchAllCategoryGroups();

    expect(result).toEqual([]);
    expect(getCategoryGroups).toHaveBeenCalledOnce();
  });
});
