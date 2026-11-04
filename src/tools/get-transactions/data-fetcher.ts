// Fetches transactions for get-transactions tool. Every filter is pushed down into Actual's
// query engine, so only matching transactions are loaded, however large the budget.
import { getPayeeCategoryCounts, queryTransactions, type PayeeCategoryCountRow } from '../../actual-api.js';
import { enrichTransactions } from '../../core/data/fetch-transactions.js';
import type { Category, Transaction } from '../../core/types/domain.js';

const MAX_HISTORY_CATEGORIES_PER_PAYEE = 3;

export interface TransactionQuery {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  /** Currency units, e.g. -50 for $50 spent. */
  minAmount?: number;
  /** Currency units. */
  maxAmount?: number;
  categoryId?: string;
  payeeName?: string;
  uncategorized?: boolean;
  limit?: number;
  offset?: number;
}

export interface PayeeCategoryHistory {
  category: string;
  category_name: string;
  count: number;
}

export class GetTransactionsDataFetcher {
  async fetch(query: TransactionQuery): Promise<{ transactions: Transaction[]; total: number }> {
    const { transactions, total } = await queryTransactions(buildTransactionFilter(query), {
      limit: query.limit,
      offset: query.offset,
    });
    return { transactions: await enrichTransactions(transactions), total };
  }

  /**
   * Returns each payee's most-used past categories, for the payees on these transactions
   * (including split lines). Counted by Actual's query engine in one query.
   */
  async fetchPayeeHistory(transactions: Transaction[]): Promise<Record<string, PayeeCategoryHistory[]>> {
    const payeeIds = new Set<string>();
    for (const t of transactions) {
      for (const line of [t, ...(t.subtransactions ?? [])]) {
        if (line.payee) payeeIds.add(line.payee);
      }
    }
    return summarizePayeeHistory(await getPayeeCategoryCounts([...payeeIds]));
  }
}

/**
 * Groups payee/category counts by payee, keeping each payee's most-used categories first.
 */
export function summarizePayeeHistory(rows: PayeeCategoryCountRow[]): Record<string, PayeeCategoryHistory[]> {
  const byPayee: Record<string, PayeeCategoryHistory[]> = {};
  for (const { payee, category, category_name, count } of rows) {
    (byPayee[payee] ??= []).push({ category, category_name, count });
  }
  for (const payee of Object.keys(byPayee)) {
    byPayee[payee] = byPayee[payee].sort((a, b) => b.count - a.count).slice(0, MAX_HISTORY_CATEGORIES_PER_PAYEE);
  }
  return byPayee;
}

/**
 * Translates get-transactions arguments into an AQL filter.
 */
export function buildTransactionFilter(query: TransactionQuery): Record<string, unknown> {
  const date: Record<string, string> = {};
  if (query.startDate) date.$gte = query.startDate;
  if (query.endDate) date.$lte = query.endDate;

  const amount: Record<string, number> = {};
  if (query.minAmount !== undefined) amount.$gte = Math.round(query.minAmount * 100);
  if (query.maxAmount !== undefined) amount.$lte = Math.round(query.maxAmount * 100);

  return {
    ...(query.accountId ? { account: query.accountId } : {}),
    ...(Object.keys(date).length > 0 ? { date } : {}),
    ...(Object.keys(amount).length > 0 ? { amount } : {}),
    ...(query.categoryId ? { category: query.categoryId } : {}),
    // Reason: $like is case- and accent-insensitive in Actual's query engine.
    ...(query.payeeName ? { 'payee.name': { $like: `%${query.payeeName}%` } } : {}),
    // Reason: matches Actual's own "Uncategorized" view. Split parents never carry a category,
    // and transfers between two on-budget accounts never take one, so both are excluded.
    ...(query.uncategorized
      ? {
          'account.offbudget': false,
          category: null,
          is_parent: false,
          $or: [{ 'payee.transfer_acct': null }, { 'payee.transfer_acct.offbudget': true }],
        }
      : {}),
  };
}

/**
 * Resolves a category name to a single category. An exact (case-insensitive) name wins;
 * otherwise a single partial match is used. Anything else throws, listing the candidates so
 * the caller can retry with a categoryId.
 */
export function resolveCategory(categories: Category[], name: string): Category {
  const needle = name.trim().toLowerCase();
  const exact = categories.filter((c) => c.name.toLowerCase() === needle);
  if (exact.length === 1) {
    return exact[0];
  }

  const candidates = exact.length > 1 ? exact : categories.filter((c) => c.name.toLowerCase().includes(needle));
  if (candidates.length === 1) {
    return candidates[0];
  }
  if (candidates.length === 0) {
    throw new Error(`No category matches "${name}". Use get-grouped-categories to list categories.`);
  }
  const list = candidates.map((c) => `${c.name} (${c.id})`).join(', ');
  throw new Error(`"${name}" matches several categories: ${list}. Pass categoryId to choose one.`);
}
