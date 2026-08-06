import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler, schema } from './index.js';
import { setBudgetAmount } from '../../actual-api.js';
import { textContent } from '../../utils/response.js';

vi.mock('../../actual-api.js', () => ({
  setBudgetAmount: vi.fn(),
}));

describe('set-budget-amount tool', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires month, categoryId, and amount', () => {
    expect(schema.name).toBe('set-budget-amount');
    expect(schema.inputSchema.required).toEqual(['month', 'categoryId', 'amount']);
  });

  it.each([0, -1250, 1250])('sets integer minor-unit amount %i', async (amount) => {
    vi.mocked(setBudgetAmount).mockResolvedValue(undefined);

    const result = await handler({ month: '2026-02', categoryId: 'category-1', amount });

    expect(setBudgetAmount).toHaveBeenCalledWith('2026-02', 'category-1', amount);
    expect(result.isError).toBeUndefined();
  });

  it.each([
    { month: '2026-00', categoryId: 'category-1', amount: 1 },
    { month: '2026-13', categoryId: 'category-1', amount: 1 },
    { month: '2026-02', categoryId: 'category-1', amount: 1.5 },
  ])('rejects invalid arguments %#', async (args) => {
    const result = await handler(args);

    expect(result.isError).toBe(true);
    expect(setBudgetAmount).not.toHaveBeenCalled();
  });

  it('returns API failures as tool errors', async () => {
    vi.mocked(setBudgetAmount).mockRejectedValue(new Error('Update failed'));

    const result = await handler({ month: '2026-02', categoryId: 'category-1', amount: 0 });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('Update failed');
  });
});
