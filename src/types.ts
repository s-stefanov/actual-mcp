// Type definitions for Actual Budget API
export {
  Account,
  Transaction,
  Category,
  CategoryGroup,
  Payee,
} from "./core/types/domain.js";

export interface BudgetFile {
  id?: string;
  cloudFileId?: string;
  name: string;
}

// Type definitions for tool arguments
export interface GetTransactionsArgs {
  accountId: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  category?: string;
  payee?: string;
  limit?: number;
}

export interface SpendingByCategoryArgs {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  includeIncome?: boolean;
}

export interface MonthlySummaryArgs {
  months?: number;
  accountId?: string;
}

export interface BalanceHistoryArgs {
  accountId: string;
  months?: number;
}

// Type for prompt arguments
export interface FinancialInsightsArgs {
  startDate?: string;
  endDate?: string;
}

export interface BudgetReviewArgs {
  months?: number;
}

// Additional types used in implementation
export interface CategoryGroupInfo {
  id: string;
  name: string;
  isIncome: boolean;
  isSavingsOrInvestment: boolean;
}

export interface CategorySpending {
  name: string;
  group: string;
  isIncome: boolean;
  total: number;
  transactions: number;
}

export interface GroupSpending {
  name: string;
  total: number;
  categories: CategorySpending[];
}

export interface MonthData {
  year: number;
  month: number;
  income: number;
  expenses: number;
  investments: number;
  transactions: number;
}

export interface MonthBalance {
  year: number;
  month: number;
  balance: number;
  transactions: number;
}
