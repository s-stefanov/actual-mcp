import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler, schema } from './index.js';
import { getBudgetMonth } from '../../actual-api.js';
import { textContent } from '../../utils/response.js';

vi.mock('../../actual-api.js', () => ({
  getBudgetMonth: vi.fn(),
}));

const budgetMonth = {
  month: '2026-02',
  incomeAvailable: 10000,
  lastMonthOverspent: 0,
  forNextMonth: 0,
  totalBudgeted: 8000,
  toBudget: 2000,
  fromLastMonth: 0,
  totalIncome: 10000,
  totalSpent: -3000,
  totalBalance: 7000,
  categoryGroups: [],
};

describe('get-budget-month tool', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires a YYYY-MM month', () => {
    expect(schema.name).toBe('get-budget-month');
    expect(schema.inputSchema.required).toEqual(['month']);
  });

  it('returns one budget month', async () => {
    vi.mocked(getBudgetMonth).mockResolvedValue(budgetMonth);

    const result = await handler({ month: '2026-02' });

    expect(getBudgetMonth).toHaveBeenCalledWith('2026-02');
    expect(JSON.parse(textContent(result.content[0]))).toEqual(budgetMonth);
  });

  it.each(['2026-00', '2026-13', '2026-1', '2026-01-01', 'not-a-month'])('rejects invalid month %s', async (month) => {
    const result = await handler({ month });

    expect(result.isError).toBe(true);
    expect(getBudgetMonth).not.toHaveBeenCalled();
  });

  it('returns API failures as tool errors', async () => {
    vi.mocked(getBudgetMonth).mockRejectedValue(new Error('Month unavailable'));

    const result = await handler({ month: '2026-02' });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('Month unavailable');
  });
});
