// Shapes monthly net worth rows into the JSON payload for net-worth
import type { AccountBalanceAtMonth, NetWorthMonth, NetWorthReportData } from './types.js';

export interface NetWorthPeriodChange {
  fromMonth: string;
  toMonth: string;
  amount: number;
  percent: number | null;
}

export interface NetWorthReport {
  amountsIn: string;
  includeOffBudget: boolean;
  includeClosed: boolean;
  months: Array<Omit<NetWorthMonth, 'accounts'>>;
  latestAccounts: AccountBalanceAtMonth[];
  periodChange: NetWorthPeriodChange | null;
}

const AMOUNTS_IN =
  'Integer cents. `liabilities` is a positive magnitude; `netWorth` is assets minus liabilities and may be negative.';

export class NetWorthReportBuilder {
  build(data: NetWorthReportData): NetWorthReport {
    const last = data.months[data.months.length - 1];

    return {
      amountsIn: AMOUNTS_IN,
      includeOffBudget: data.includeOffBudget,
      includeClosed: data.includeClosed,
      // Reason: per-account balances are returned once, for the latest month,
      // rather than repeated on every month of the series.
      months: data.months.map(({ accounts: _accounts, ...month }) => month),
      latestAccounts: last ? [...last.accounts].sort((a, b) => b.balance - a.balance) : [],
      periodChange: this.periodChange(data.months),
    };
  }

  private periodChange(months: NetWorthMonth[]): NetWorthPeriodChange | null {
    if (months.length < 2) return null;

    const first = months[0];
    const last = months[months.length - 1];
    const amount = last.netWorth - first.netWorth;

    return {
      fromMonth: first.month,
      toMonth: last.month,
      amount,
      percent: first.netWorth === 0 ? null : (amount / Math.abs(first.netWorth)) * 100,
    };
  }
}
