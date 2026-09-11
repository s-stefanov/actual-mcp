import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAccountBalance = vi.fn();
const fetchAllAccounts = vi.fn();

vi.mock('@actual-app/api', () => ({
  getAccountBalance: (...args: unknown[]) => getAccountBalance(...args),
}));

vi.mock('../../core/data/fetch-accounts.js', () => ({
  fetchAllAccounts: () => fetchAllAccounts(),
}));

const { handler } = await import('./index.js');

describe('get-accounts balance cutoff', () => {
  beforeEach(() => {
    getAccountBalance.mockReset();
    fetchAllAccounts.mockReset();
    fetchAllAccounts.mockResolvedValue([{ id: 'acc-1', name: 'Car Loan', offbudget: true, closed: false }]);
  });

  it('does not pass a cutoff, so future-dated transactions are excluded', async () => {
    // Regression: a hardcoded `new Date('2099-01-01')` cutoff asked for the
    // balance as of 2099, which folded scheduled future payments into the
    // current balance and over-reported debt.
    getAccountBalance.mockResolvedValue(-15343201);

    await handler();

    expect(getAccountBalance).toHaveBeenCalledWith('acc-1');
    expect(getAccountBalance.mock.calls[0][1]).toBeUndefined();
  });

  it('never passes a Date instance', async () => {
    getAccountBalance.mockResolvedValue(0);

    await handler();

    const cutoff = getAccountBalance.mock.calls[0][1];
    expect(cutoff).not.toBeInstanceOf(Date);
  });

  it('reports the balance returned by the API', async () => {
    getAccountBalance.mockResolvedValue(-15343201);

    const result = await handler();

    // Assert the numeric value, not the rendering: currency formatting depends on
    // the budget's locale preferences, which are not loaded in a unit test.
    const payload = JSON.parse(JSON.parse(JSON.stringify(result)).content[0].text);
    expect(payload[0].balance).toMatch(/153[,.]432[,.]01/);
    expect(payload[0].offBudget).toBe(true);
  });
});
