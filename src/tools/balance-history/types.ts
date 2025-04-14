// Types/interfaces for balance-history tool

export interface BalanceHistoryArgs {
  accountId: string;
  months?: number;
}

export interface MonthBalance {
  year: number;
  month: number;
  balance: number;
  transactions: number;
}
