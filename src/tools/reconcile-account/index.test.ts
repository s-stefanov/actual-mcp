import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

vi.mock('../../actual-automation-api.js', () => ({
  reconcileAccount: vi.fn(),
}));

vi.mock('../../actual-api.js', () => ({
  getAccounts: vi.fn(),
}));

import { reconcileAccount } from '../../actual-automation-api.js';
import { getAccounts } from '../../actual-api.js';

const text = (result: { content: Array<{ type: string; text?: string }> }): string => result.content[0].text ?? '';
const args = { accountId: 'a1', date: '2026-10-31', balance: 271878 };

describe('reconcile-account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccounts).mockResolvedValue([{ id: 'a1', name: 'Checking' }] as never);
  });

  it('rejects an unknown account instead of reading it as a zero balance', async () => {
    const result = await handler({ ...args, accountId: 'missing', balance: 0 });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('does not exist');
    expect(reconcileAccount).not.toHaveBeenCalled();
  });

  it('locks the cleared transactions when the balances match', async () => {
    vi.mocked(reconcileAccount).mockResolvedValue({ clearedBalance: 271878, locked: 3 });

    const result = JSON.parse(text(await handler(args)));

    expect(reconcileAccount).toHaveBeenCalledWith('a1', '2026-10-31', 271878, false);
    expect(result).toMatchObject({ reconciled: true, difference: 0, lockedTransactions: 3 });
  });

  it('reports the difference and locks nothing when the balances differ', async () => {
    vi.mocked(reconcileAccount).mockResolvedValue({ clearedBalance: 270000, locked: null });

    const result = JSON.parse(text(await handler(args)));

    expect(result).toMatchObject({ reconciled: false, difference: 1878 });
  });

  it('never locks on a dry run', async () => {
    vi.mocked(reconcileAccount).mockResolvedValue({ clearedBalance: 271878, locked: null });

    const result = JSON.parse(text(await handler({ ...args, dryRun: true })));

    expect(reconcileAccount).toHaveBeenCalledWith('a1', '2026-10-31', 271878, true);
    expect(result).toMatchObject({ reconciled: false, difference: 0 });
  });

  it.each([[{ ...args, accountId: '' }], [{ ...args, date: '31/10/2026' }], [{ ...args, balance: 2718.78 }]])(
    'rejects %j',
    async (bad) => {
      expect((await handler(bad)).isError).toBe(true);
      expect(reconcileAccount).not.toHaveBeenCalled();
    }
  );
});
