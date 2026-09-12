// Shapes ranked payee totals into the JSON payload for spending-by-payee
import type { PayeeSpending, SpendingByPayeeReportData } from './types.js';

export interface SpendingByPayeeReport {
  amountsIn: string;
  startDate: string;
  endDate: string;
  accountName: string | null;
  includeIncome: boolean;
  payees: PayeeSpending[];
  listedCount: number;
  totalPayeeCount: number;
  grandTotal: number;
  excludesTransfers: true;
}

const AMOUNTS_IN =
  'Integer cents, as positive magnitudes. `share` is the percentage of grandTotal, which covers every payee, not only the listed ones.';

export class SpendingByPayeeReportBuilder {
  build(data: SpendingByPayeeReportData): SpendingByPayeeReport {
    return {
      amountsIn: AMOUNTS_IN,
      startDate: data.start,
      endDate: data.end,
      accountName: data.accountName ?? null,
      includeIncome: data.includeIncome,
      payees: data.payees,
      listedCount: data.payees.length,
      totalPayeeCount: data.totalListed,
      grandTotal: data.grandTotal,
      excludesTransfers: true,
    };
  }
}
