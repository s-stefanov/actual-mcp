// Types/interfaces for spending-by-category tool

export interface CategorySpending {
  id: string;
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
