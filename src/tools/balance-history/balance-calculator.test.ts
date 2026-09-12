import { describe, expect, it } from 'vitest';
import type { Account, Transaction } from '../../types.js';
import { BalanceHistoryCalculator, type MonthBalance } from './balance-calculator.js';

const calculator = new BalanceHistoryCalculator();

function singleAccount(balance: number): Account {
  return { id: 'a1', name: 'Checking', balance };
}

function expense(date: string, amount: number, account = 'a1'): Transaction {
  return { id: `${account}-${date}`, account, date, amount };
}

function calculate(account: Account, transactions: Transaction[], months: number, end: string): MonthBalance[] {
  return calculator.calculate(account, [account], transactions, months, new Date(`${end}T12:00:00`));
}

describe('BalanceHistoryCalculator', () => {
  it('keeps the as-of balance for a partial current month before reversing its transactions', () => {
    expect(calculate(singleAccount(10_000), [expense('2026-09-05', -2_000)], 2, '2026-09-12')).toMatchObject([
      { year: 2026, month: 9, balance: 10_000, transactions: 1, isPartial: true },
      { year: 2026, month: 8, balance: 12_000, transactions: 0, isPartial: false },
    ]);
  });

  it('uses explicit month indexes at a 31-day boundary', () => {
    expect(calculate(singleAccount(500), [], 3, '2026-03-31').map(({ year, month }) => ({ year, month }))).toEqual([
      { year: 2026, month: 3 },
      { year: 2026, month: 2 },
      { year: 2026, month: 1 },
    ]);
  });

  it('assigns leap-day transactions to February', () => {
    expect(calculate(singleAccount(700), [expense('2024-02-29', -100)], 2, '2024-02-29')).toMatchObject([
      { year: 2024, month: 2, balance: 700, transactions: 1, isPartial: true },
      { year: 2024, month: 1, balance: 800, transactions: 0, isPartial: false },
    ]);
  });

  it('keeps same-named accounts separate by account ID', () => {
    const accounts: Account[] = [
      { id: 'a1', name: 'Checking', balance: 10_000 },
      { id: 'a2', name: 'Checking', balance: 20_000 },
    ];

    const result = calculator.calculate(
      undefined,
      accounts,
      [expense('2026-09-05', -1_000, 'a1'), expense('2026-09-06', -2_000, 'a2')],
      2,
      new Date('2026-09-12T12:00:00')
    );

    expect(result).toMatchObject([
      { accountId: 'a1', account: 'Checking', year: 2026, month: 9, balance: 10_000, transactions: 1 },
      { accountId: 'a2', account: 'Checking', year: 2026, month: 9, balance: 20_000, transactions: 1 },
      { accountId: 'a1', account: 'Checking', year: 2026, month: 8, balance: 11_000, transactions: 0 },
      { accountId: 'a2', account: 'Checking', year: 2026, month: 8, balance: 22_000, transactions: 0 },
    ]);
  });
});
