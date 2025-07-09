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

export interface Rule {
  id: string;
  stage: "pre" | "post" | null;
  conditionsOp: "and" | "or";
  conditions: Condition[];
  actions: Action[];
}

export interface Condition {
  field:
    | "account"
    | "category"
    | "date"
    | "payee"
    | "amount"
    | "imported_payee";
  op:
    | "is"
    | "isNot"
    | "oneOf"
    | "notOneOf"
    | "onBudget"
    | "offBudget"
    | "isapprox"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "isbetween"
    | "contains"
    | "doesNotContain"
    | "matches"
    | "hasTags";
  value: string | number | string[] | number[];
  type?: string;
}

export interface Action {
  field:
    | "account"
    | "category"
    | "date"
    | "payee"
    | "amount"
    | "cleared"
    | "notes"
    | null;
  op: "set" | "prepend-notes" | "append-notes" | "set-split-amount";
  value: boolean | string | number | null;
  type?: string;
  options: {
    splitIndex: number;
    method?: "fixed-amount" | "fixed-percent" | "remainder";
  };
}
