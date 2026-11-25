import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler as checkHandler } from './check-budget-templates/index.js';
import { handler as applyHandler } from './apply-budget-templates/index.js';

vi.mock('../../actual-automation-api.js', () => ({
  checkBudgetTemplates: vi.fn(),
  applyBudgetTemplates: vi.fn(),
}));

import { applyBudgetTemplates, checkBudgetTemplates } from '../../actual-automation-api.js';

const text = (result: { content: Array<{ type: string; text?: string }> }): string => result.content[0].text ?? '';

describe('budget template tools', () => {
  beforeEach(() => vi.clearAllMocks());

  it("check-budget-templates returns Actual's report", async () => {
    vi.mocked(checkBudgetTemplates).mockResolvedValue({
      sticky: true,
      message: 'template-errors',
      pre: 'Internet: Schedule "Digi" does not exist\n\nRent: #template 12x',
    });

    const result = await checkHandler();

    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toEqual({
      ok: false,
      status: 'template-errors',
      errors: ['Internet: Schedule "Digi" does not exist', 'Rent: #template 12x'],
    });
  });

  it('check-budget-templates reports ok when every template parses', async () => {
    vi.mocked(checkBudgetTemplates).mockResolvedValue({ type: 'message', message: 'templates-check-passed' });

    expect(JSON.parse(text(await checkHandler()))).toEqual({ ok: true, status: 'templates-check-passed', errors: [] });
  });

  it('check-budget-templates turns a failure into an error response', async () => {
    vi.mocked(checkBudgetTemplates).mockRejectedValue(new Error('no budget'));

    expect((await checkHandler()).isError).toBe(true);
  });

  it('apply-budget-templates fills only empty categories by default', async () => {
    vi.mocked(applyBudgetTemplates).mockResolvedValue({ type: 'message', message: 'templates-applied', count: 12 });

    const result = await applyHandler({ month: '2026-12' });

    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toEqual({ ok: true, status: 'templates-applied', errors: [], applied: 12 });
    expect(applyBudgetTemplates).toHaveBeenCalledWith('2026-12', { overwrite: false, categoryIds: undefined });
  });

  it('apply-budget-templates passes overwrite and categoryIds through', async () => {
    vi.mocked(applyBudgetTemplates).mockResolvedValue({ type: 'message', message: 'templates-up-to-date' });

    await applyHandler({ month: '2026-12', overwrite: true, categoryIds: ['c1'] });

    expect(applyBudgetTemplates).toHaveBeenCalledWith('2026-12', { overwrite: true, categoryIds: ['c1'] });
  });

  it.each([
    [{}],
    [{ month: '2026-1' }],
    [{ month: '2026-12', overwrite: 'yes' }],
    [{ month: '2026-12', categoryIds: [1] }],
    [{ month: '2026-12', overwrite: true, categoryIds: [] }],
  ])('apply-budget-templates rejects %j', async (args) => {
    expect((await applyHandler(args)).isError).toBe(true);
    expect(applyBudgetTemplates).not.toHaveBeenCalled();
  });
});
