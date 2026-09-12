import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getBudgetMonths: vi.fn(),
  getBudgetMonth: vi.fn(),
}));

import { BudgetVsActualDataFetcher } from './data-fetcher.js';
import { getBudgetMonths, getBudgetMonth } from '../../actual-api.js';
import type { BudgetMonth } from '../../types.js';

const stub = (month: string): BudgetMonth => ({ month }) as BudgetMonth;

describe('BudgetVsActualDataFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBudgetMonth).mockImplementation(async (m: string) => stub(m));
  });

  it('fetches every requested month when the budget covers them all', async () => {
    vi.mocked(getBudgetMonths).mockResolvedValue(['2026-06', '2026-07', '2026-08']);

    const result = await new BudgetVsActualDataFetcher().fetchMonths(['2026-07', '2026-08']);

    expect(result.budgetMonths.map((m) => m.month)).toEqual(['2026-07', '2026-08']);
    expect(result.missingMonths).toEqual([]);
    expect(getBudgetMonth).toHaveBeenCalledTimes(2);
  });

  it('reports months outside the budget rather than throwing', async () => {
    // Reason: asking for more months than the file covers should still return
    // the months that do exist.
    vi.mocked(getBudgetMonths).mockResolvedValue(['2026-07']);

    const result = await new BudgetVsActualDataFetcher().fetchMonths(['2026-05', '2026-06', '2026-07']);

    expect(result.budgetMonths.map((m) => m.month)).toEqual(['2026-07']);
    expect(result.missingMonths).toEqual(['2026-05', '2026-06']);
    expect(getBudgetMonth).toHaveBeenCalledTimes(1);
  });

  it('returns nothing to render when no requested month has data', async () => {
    vi.mocked(getBudgetMonths).mockResolvedValue([]);

    const result = await new BudgetVsActualDataFetcher().fetchMonths(['2026-07']);

    expect(result.budgetMonths).toEqual([]);
    expect(result.missingMonths).toEqual(['2026-07']);
    expect(getBudgetMonth).not.toHaveBeenCalled();
  });

  it('propagates an API failure', async () => {
    vi.mocked(getBudgetMonths).mockRejectedValue(new Error('API Error'));

    await expect(new BudgetVsActualDataFetcher().fetchMonths(['2026-07'])).rejects.toThrow('API Error');
  });
});
