import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler as getHandler } from './get-preferences/index.js';
import { handler as setHandler } from './set-preference/index.js';

vi.mock('../../actual-automation-api.js', () => ({
  getPreferences: vi.fn(),
  setPreference: vi.fn(),
}));

import { getPreferences, setPreference } from '../../actual-automation-api.js';

const text = (result: { content: Array<{ type: string; text?: string }> }): string => result.content[0].text ?? '';

describe('preference tools', () => {
  beforeEach(() => vi.clearAllMocks());

  it('get-preferences returns the synced preferences', async () => {
    vi.mocked(getPreferences).mockResolvedValue({ 'learn-categories': 'true', budgetType: 'envelope' } as never);

    expect(JSON.parse(text(await getHandler()))['learn-categories']).toBe('true');
  });

  it('set-preference turns category learning off', async () => {
    const result = await setHandler({ key: 'learn-categories', value: 'false' });

    expect(result.isError).toBeFalsy();
    expect(setPreference).toHaveBeenCalledWith('learn-categories', 'false');
  });

  it.each([
    [{ value: 'false' }],
    [{ key: 'learn-categories', value: false }],
    [{ key: 'learn-categories', value: null }],
    [{ key: 'learn-categories' }],
  ])('set-preference rejects %j', async (args) => {
    expect((await setHandler(args)).isError).toBe(true);
    expect(setPreference).not.toHaveBeenCalled();
  });
});
