// Shared domain types and interfaces (Account, Transaction, Category, etc.)

export interface Account {
  id: string;
  name: string;
  type?: string;
  offbudget?: boolean;
  closed?: boolean;
  balance?: number;
}

export interface Transaction {
  id: string;
  account: string;
  date: string;
  amount: number;
  payee?: string | null;
  payee_name?: string;
  category?: string;
  category_name?: string;
  notes?: string;
  transfer_id?: string;
  cleared?: boolean;
  // Reason: Actual returns split transactions as a parent with a nested `subtransactions`
  // array (one level deep) when queried with `splits: 'grouped'`, which is what the
  // underlying getTransactions call uses. is_parent/is_child/parent_id mirror Actual's own
  // TransactionEntity so callers can tell a split leg apart from a regular transaction.
  is_parent?: boolean;
  is_child?: boolean;
  parent_id?: string;
  subtransactions?: Transaction[];
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
  categories?: Category[];
}

export interface CategoryGroupInfo {
  id: string;
  name: string;
  isIncome: boolean;
  isSavingsOrInvestment: boolean;
}

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

export interface Payee {
  id: string;
  name: string;
  transfer_acct?: string;
}
