// Types/interfaces for spending-by-payee tool

export interface PayeeSpending {
  id: string;
  name: string;
  total: number;
  transactions: number;
  average: number;
  share: number;
}

export interface SpendingByPayeeReportData {
  start: string;
  end: string;
  accountName?: string;
  includeIncome: boolean;
  payees: PayeeSpending[];
  totalListed: number;
  grandTotal: number;
}
