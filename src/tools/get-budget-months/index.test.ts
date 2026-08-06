import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler, schema } from './index.js';
import { getBudgetMonths } from '../../actual-api.js';
import { textContent } from '../../utils/response.js';

vi.mock('../../actual-api.js', () => ({
  getBudgetMonths: vi.fn(),
}));

describe('get-budget-months tool', () => {
  beforeEach(() => vi.clearAllMocks());

  it('declares a no-argument read tool schema', () => {
    expect(schema.name).toBe('get-budget-months');
    expect(schema.inputSchema.properties).toEqual({});
    expect(schema.inputSchema.additionalProperties).toBe(false);
  });

  it('returns the available budget months', async () => {
    vi.mocked(getBudgetMonths).mockResolvedValue(['2026-01', '2026-02']);

    const result = await handler();

    expect(getBudgetMonths).toHaveBeenCalledOnce();
    expect(JSON.parse(textContent(result.content[0]))).toEqual(['2026-01', '2026-02']);
  });

  it('returns API failures as tool errors', async () => {
    vi.mocked(getBudgetMonths).mockRejectedValue(new Error('Unable to load months'));

    const result = await handler();

    expect(result.isError).toBe(true);
    expect(textContent(result.content[0])).toContain('Unable to load months');
  });
});
