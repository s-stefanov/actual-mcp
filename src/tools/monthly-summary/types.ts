// Types and interfaces specific to monthly summary
import { MonthData } from '../../types.js';
export interface MonthlySummaryReportData {
  start: string;
  end: string;
  accountName?: string;
  accountId?: string;
  sortedMonths: MonthData[];
  avgIncome: number;
  avgExpenses: number;
  avgSavings: number;
  avgSavingsRate: number;
}
