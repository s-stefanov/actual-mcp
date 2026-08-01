import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler, schema } from './index.js';
import { setBudgetCarryover } from '../../actual-api.js';
import { textContent } from '../../utils/response.js';

vi.mock('../../actual-api.js', () => ({
  setBudgetCarryover: vi.fn(),
}));

describe('set-budget-carryover tool', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires month, categoryId, and carryover', () => {
    expect(schema.name).toBe('set-budget-carryover');
    expect(schema.inputSchema.required).toEqual(['month', 'categoryId', 'carryover']);
  });

  it.each([true, false])('sets carryover to %s', async (carryover) => {
    vi.mocked(setBudgetCarryover).mockResolvedValue(undefined);

    const result = await handler({ month: '2026-02', categoryId: 'category-1', carryover });

    expect(setBudgetCarryover).toHaveBeenCalledWith('2026-02', 'category-1', carryover);
    expect(result.isError).toBeUndefined();
  });

  it.each([
    { month: '2026-00', categoryId: 'category-1', carryover: true },
    { month: '2026-13', categoryId: 'category-1', carryover: true },
    { month: '2026-02', categoryId: 'category-1', carryover: 'yes' },
  ])('rejects invalid arguments %#', async (args) => {
    // @ts-expect-error Testing runtime validation of untrusted MCP arguments.
    const result = await handler(args);

    expect(result.isError).toBe(true);
    expect(setBudgetCarryover).not.toHaveBeenCalled();
  });

  it('returns API failures as tool errors', async () => {
    vi.mocked(setBudgetCarryover).mockRejectedValue(new Error('Update failed'));

    const result = await handler({ month: '2026-02', categoryId: 'category-1', carryover: true });

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('Update failed');
  });
});
