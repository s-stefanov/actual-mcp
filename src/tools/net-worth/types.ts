// Types/interfaces for net-worth tool

export interface AccountBalanceAtMonth {
  id: string;
  name: string;
  offBudget: boolean;
  balance: number;
}

export interface NetWorthMonth {
  month: string;
  assets: number;
  liabilities: number;
  netWorth: number;
  change?: number;
  accounts: AccountBalanceAtMonth[];
}

export interface NetWorthReportData {
  months: NetWorthMonth[];
  includeOffBudget: boolean;
  includeClosed: boolean;
}
