import * as api from '@actual-app/api';
import { APIAccountEntity, APICategoryEntity, APICategoryGroupEntity, APIPayeeEntity } from '@actual-app/api/models';
import { RuleEntity, TransactionEntity } from '@actual-app/core/types/models';
import { ImportTransactionEntity } from '@actual-app/core/types/models/import-transaction';
import { getActualConnection } from './integrations/actual/connection.js';
import { TransactionData, UpdateTransactionData } from './types.js';

/**
 * @deprecated Use getActualConnection().ensureReady(). Kept for callers that
 * still expect the old initializer name.
 */
export async function initActualApi(): Promise<void> {
  return getActualConnection().ensureReady();
}

/**
 * @deprecated Use getActualConnection().drainAndClose(). Kept for callers that
 * still expect the old shutdown name.
 */
export async function shutdownActualApi(): Promise<void> {
  return getActualConnection().drainAndClose();
}

// ----------------------------
// FETCH
// ----------------------------

/** Get all accounts. */
export async function getAccounts(): Promise<APIAccountEntity[]> {
  return getActualConnection().run(() => api.getAccounts());
}

/** Get all categories. */
export async function getCategories(): Promise<(APICategoryEntity | APICategoryGroupEntity)[]> {
  return getActualConnection().run(() => api.getCategories());
}

/** Get all category groups. */
export async function getCategoryGroups(): Promise<APICategoryGroupEntity[]> {
  return getActualConnection().run(() => api.getCategoryGroups());
}

/** Get all payees. */
export async function getPayees(): Promise<APIPayeeEntity[]> {
  return getActualConnection().run(() => api.getPayees());
}

/** Get transactions for a specific account and date range. */
export async function getTransactions(accountId: string, start: string, end: string): Promise<TransactionEntity[]> {
  return getActualConnection().run(() => api.getTransactions(accountId, start, end));
}

/** Get all rules. */
export async function getRules(): Promise<RuleEntity[]> {
  return getActualConnection().run(() => api.getRules());
}

/**
 * Balance as of an optional cutoff date. NOTE: the 2099 far-future cutoff at
 * call sites is addressed in Part 2 (report semantics); this wrapper only
 * routes the existing behavior through the connection queue.
 */
export async function getAccountBalance(accountId: string, cutoff?: Date): Promise<number> {
  return getActualConnection().run(() => api.getAccountBalance(accountId, cutoff));
}

// ----------------------------
// ACTION
// ----------------------------

/** Create a new payee. */
export async function createPayee(args: Record<string, unknown>): Promise<string> {
  return getActualConnection().run(() => api.createPayee(args as unknown as Omit<APIPayeeEntity, 'id'>));
}

/** Update a payee. */
export async function updatePayee(id: string, args: Record<string, unknown>): Promise<unknown> {
  return getActualConnection().run(() => api.updatePayee(id, args));
}

/** Delete a payee. */
export async function deletePayee(id: string): Promise<unknown> {
  return getActualConnection().run(() => api.deletePayee(id));
}

/** Create a new rule. */
export async function createRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return getActualConnection().run(() => api.createRule(args as unknown as Omit<RuleEntity, 'id'>));
}

/** Update a rule. */
export async function updateRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return getActualConnection().run(() => api.updateRule(args as unknown as RuleEntity));
}

/** Delete a rule. */
export async function deleteRule(id: string): Promise<boolean> {
  return getActualConnection().run(() => api.deleteRule(id));
}

/** Create a new category. */
export async function createCategory(args: Record<string, unknown>): Promise<string> {
  return getActualConnection().run(() => api.createCategory(args as unknown as Omit<APICategoryEntity, 'id'>));
}

/** Update a category. */
export async function updateCategory(id: string, args: Record<string, unknown>): Promise<unknown> {
  return getActualConnection().run(() => api.updateCategory(id, args));
}

/** Delete a category. */
export async function deleteCategory(id: string): Promise<void> {
  return getActualConnection().run(() => api.deleteCategory(id));
}

/** Create a new category group. */
export async function createCategoryGroup(args: Record<string, unknown>): Promise<string> {
  return getActualConnection().run(() =>
    api.createCategoryGroup(args as unknown as Omit<APICategoryGroupEntity, 'id'>)
  );
}

/** Update a category group. */
export async function updateCategoryGroup(id: string, args: Record<string, unknown>): Promise<unknown> {
  return getActualConnection().run(() => api.updateCategoryGroup(id, args));
}

/** Delete a category group. */
export async function deleteCategoryGroup(id: string): Promise<unknown> {
  return getActualConnection().run(() => api.deleteCategoryGroup(id));
}

/**
 * Create a transaction. Passes runTransfers so transfer payees automatically
 * create the counterpart transaction.
 */
export async function createTransaction(accountId: string, data: TransactionData): Promise<string> {
  return getActualConnection().run(() => api.addTransactions(accountId, [data], { runTransfers: true }));
}

/** Import transactions using Actual's reconciliation logic. */
export async function importTransactions(
  accountId: string,
  transactions: ImportTransactionEntity[],
  opts?: { defaultCleared?: boolean; dryRun?: boolean }
): Promise<{ added: string[]; updated: string[]; errors: Array<{ message: string }> }> {
  return getActualConnection().run(() => api.importTransactions(accountId, transactions, opts));
}

/** Update a transaction. */
export async function updateTransaction(id: string, data: UpdateTransactionData): Promise<unknown> {
  return getActualConnection().run(() => api.updateTransaction(id, data as unknown as Partial<TransactionEntity>));
}

/** Delete a transaction. */
export async function deleteTransaction(id: string): Promise<unknown> {
  return getActualConnection().run(() => api.deleteTransaction(id));
}

/**
 * Run bank sync for linked accounts. `accountId` may identify a specific
 * account, `onbudget`, `offbudget`, or be omitted to sync all accounts.
 */
export async function runBankSync(accountId?: string): Promise<void> {
  return getActualConnection().run(() => api.runBankSync(accountId ? { accountId } : undefined));
}
