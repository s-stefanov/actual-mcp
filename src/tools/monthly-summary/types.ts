// Types and interfaces specific to monthly summary
export interface MonthlySummaryReportData {
  start: string;
  end: string;
  accountName?: string;
  accountId?: string;
  sortedMonths: any[];
  avgIncome: number;
  avgExpenses: number;
  avgInvestments: number;
  avgTraditionalSavings: number;
  avgTotalSavings: number;
  avgTraditionalSavingsRate: number;
  avgTotalSavingsRate: number;
}
