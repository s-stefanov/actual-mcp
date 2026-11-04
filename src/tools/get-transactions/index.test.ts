import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./data-fetcher.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./data-fetcher.js')>();
  const fetch = vi.fn();
  return {
    ...actual,
    GetTransactionsDataFetcher: vi.fn(function () {
      return { fetch, fetchPayeeHistory: vi.fn() };
    }),
    __fetch: fetch,
  };
});
vi.mock('../../core/data/fetch-categories.js', () => ({
  fetchAllCategories: vi.fn(async () => [{ id: 'groceries', name: 'Groceries', group_id: 'g' }]),
}));

import * as dataFetcher from './data-fetcher.js';
import { handler } from './index.js';

const fetch = (dataFetcher as unknown as { __fetch: ReturnType<typeof vi.fn> }).__fetch;

describe('get-transactions handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockResolvedValue({ transactions: [], total: 0 });
  });

  it('leaves startDate open when a search gives only endDate', async () => {
    await handler({ categoryName: 'Groceries', endDate: '2020-12-31' });

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'groceries', startDate: undefined, endDate: '2020-12-31' })
    );
  });

  it('defaults the page size for searches but not for plain listings', async () => {
    await handler({ uncategorized: true });
    expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 100, startDate: undefined }));

    await handler({ payeeName: 'Whole', limit: 5 });
    expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 5 }));

    await handler({ notes: 'tax' });
    expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining({ notes: 'tax', limit: 100, startDate: undefined }));

    await handler({ startDate: '2026-01-01', endDate: '2026-01-31' });
    expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining({ limit: undefined, startDate: '2026-01-01' }));
  });

  it('rejects uncategorized combined with a category filter without querying', async () => {
    const result = await handler({ uncategorized: true, categoryId: 'groceries' });

    expect(result.isError).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
