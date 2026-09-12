// Types/interfaces for cash-flow tool

export interface CashFlowPeriod {
  label: string;
  key: string;
  income: number;
  expenses: number;
  net: number;
  runningNet: number;
  transactions: number;
}

export interface CashFlowReportData {
  start: string;
  end: string;
  interval: 'monthly' | 'weekly';
  accountName?: string;
  periods: CashFlowPeriod[];
}
