// Types/interfaces for get-transactions tool

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

export interface MappedTransaction {
  date: string;
  payee: string;
  category: string;
  amount: string;
  notes: string;
}
