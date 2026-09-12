// Shapes bucketed periods into the JSON payload for cash-flow
import type { CashFlowPeriod, CashFlowReportData } from './types.js';

export interface CashFlowSummary {
  totalIncome: number;
  totalExpenses: number;
  net: number;
  averageNetPerPeriod: number;
  negativePeriods: number;
  periodCount: number;
}

export interface CashFlowReport {
  amountsIn: string;
  startDate: string;
  endDate: string;
  interval: 'monthly' | 'weekly';
  accountName: string | null;
  periods: CashFlowPeriod[];
  summary: CashFlowSummary;
  excludesTransfers: true;
}

const AMOUNTS_IN =
  'Integer cents. `expenses` is a positive magnitude; `net` is income minus expenses. `runningNet` accumulates across the reported periods and is not an account balance.';

export class CashFlowReportBuilder {
  build(data: CashFlowReportData): CashFlowReport {
    return {
      amountsIn: AMOUNTS_IN,
      startDate: data.start,
      endDate: data.end,
      interval: data.interval,
      accountName: data.accountName ?? null,
      periods: data.periods,
      summary: this.summarize(data.periods),
      excludesTransfers: true,
    };
  }

  private summarize(periods: CashFlowPeriod[]): CashFlowSummary {
    const totalIncome = periods.reduce((sum, p) => sum + p.income, 0);
    const totalExpenses = periods.reduce((sum, p) => sum + p.expenses, 0);
    const net = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      net,
      averageNetPerPeriod: periods.length > 0 ? net / periods.length : 0,
      negativePeriods: periods.filter((p) => p.net < 0).length,
      periodCount: periods.length,
    };
  }
}
