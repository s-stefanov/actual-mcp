// Types/interfaces for budget-vs-actual tool

export interface CategoryBudgetRow {
  id: string;
  name: string;
  group: string;
  budgeted: number;
  spent: number;
  balance: number;
  carryover: boolean;
}

export interface GroupBudgetRow {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  balance: number;
  categories: CategoryBudgetRow[];
}

export interface MonthBudgetReport {
  month: string;
  totalBudgeted: number;
  totalSpent: number;
  toBudget: number;
  groups: GroupBudgetRow[];
}

export interface BudgetVsActualReportData {
  months: MonthBudgetReport[];
  categoryGroupName?: string;
  missingMonths: string[];
}
