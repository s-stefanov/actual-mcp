// Type definitions for Actual Budget API
export interface Account {
  id: string;
  name: string;
  type?: string;
  offbudget?: boolean;
  closed?: boolean;
  balance?: number;
}

export interface Transaction {
  id?: string;
  account: string;
  date: string;
  amount: number;
  payee?: string;
  payee_name?: string;
  category?: string;
  category_name?: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  group_id: string;
  is_income?: boolean;
}

export interface CategoryGroup {
  id: string;
  name: string;
  is_income?: boolean;
}

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
