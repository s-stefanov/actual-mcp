import * as api from '@actual-app/api';
import { APIAccountEntity, APICategoryEntity, APICategoryGroupEntity, APIPayeeEntity } from '@actual-app/api/models';
import {
  CustomReportEntity,
  DashboardPageEntity,
  DashboardWidgetEntity,
  RuleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import type { Handlers } from '@actual-app/core/types/handlers';
import { ImportTransactionEntity } from '@actual-app/core/types/models/import-transaction';
import { getActualConnection } from './integrations/actual/connection.js';
import { BudgetMonth, TransactionData, UpdateTransactionData } from './types.js';

/**
 * Ensures the shared Actual connection is ready.
 *
 * @deprecated Use `getActualConnection().ensureReady()` directly.
 */
export function initActualApi(): Promise<void> {
  return getActualConnection().ensureReady();
}

/**
 * Drains pending work and closes the shared Actual connection.
 *
 * @deprecated Use `getActualConnection().drainAndClose()` directly.
 */
export function shutdownActualApi(): Promise<void> {
  return getActualConnection().drainAndClose();
}

/**
 * Returns every account in the loaded budget.
 */
export function getAccounts(): Promise<APIAccountEntity[]> {
  return getActualConnection().run(() => api.getAccounts());
}

/**
 * Returns every category in the loaded budget.
 */
export function getCategories(): Promise<(APICategoryEntity | APICategoryGroupEntity)[]> {
  return getActualConnection().run(() => api.getCategories());
}

/**
 * Returns every category group in the loaded budget.
 */
export function getCategoryGroups(): Promise<APICategoryGroupEntity[]> {
  return getActualConnection().run(() => api.getCategoryGroups());
}

/**
 * Returns every payee in the loaded budget.
 */
export function getPayees(): Promise<APIPayeeEntity[]> {
  return getActualConnection().run(() => api.getPayees());
}

/**
 * Returns transactions for an account within an inclusive date range.
 */
export function getTransactions(accountId: string, start: string, end: string): Promise<TransactionEntity[]> {
  return getActualConnection().run(() => api.getTransactions(accountId, start, end));
}

/**
 * Returns the months for which the loaded budget has data.
 */
export function getBudgetMonths(): Promise<string[]> {
  return getActualConnection().run(() => api.getBudgetMonths());
}

/**
 * Returns budget data for a month in `YYYY-MM` format.
 */
export function getBudgetMonth(month: string): Promise<BudgetMonth> {
  return getActualConnection().run(() => api.getBudgetMonth(month) as unknown as Promise<BudgetMonth>);
}

/**
 * Returns an account balance, optionally as of a cutoff date.
 */
export function getAccountBalance(accountId: string, cutoff?: Date): Promise<number> {
  return getActualConnection().run(() => api.getAccountBalance(accountId, cutoff));
}

/**
 * Returns every transaction rule in the loaded budget.
 */
export function getRules(): Promise<RuleEntity[]> {
  return getActualConnection().run(() => api.getRules());
}

/**
 * Creates a payee and returns its identifier.
 */
export function createPayee(args: Record<string, unknown>): Promise<string> {
  return getActualConnection().run(() => api.createPayee(args as unknown as Omit<APIPayeeEntity, 'id'>));
}

/**
 * Updates a payee with the supplied fields.
 */
export function updatePayee(id: string, args: Record<string, unknown>): Promise<unknown> {
  return getActualConnection().run(() => api.updatePayee(id, args));
}

/**
 * Deletes a payee by identifier.
 */
export function deletePayee(id: string): Promise<unknown> {
  return getActualConnection().run(() => api.deletePayee(id));
}

/**
 * Creates a transaction rule and returns the resulting entity.
 */
export function createRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return getActualConnection().run(() => api.createRule(args as unknown as Omit<RuleEntity, 'id'>));
}

/**
 * Updates an existing transaction rule.
 */
export function updateRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return getActualConnection().run(() => api.updateRule(args as unknown as RuleEntity));
}

/**
 * Deletes a transaction rule by identifier.
 */
export function deleteRule(id: string): Promise<boolean> {
  return getActualConnection().run(() => api.deleteRule(id));
}

/**
 * Creates a category and returns its identifier.
 */
export function createCategory(args: Record<string, unknown>): Promise<string> {
  return getActualConnection().run(() => api.createCategory(args as unknown as Omit<APICategoryEntity, 'id'>));
}

/**
 * Updates a category with the supplied fields.
 */
export function updateCategory(id: string, args: Record<string, unknown>): Promise<unknown> {
  return getActualConnection().run(() => api.updateCategory(id, args));
}

/**
 * Deletes a category by identifier.
 */
export function deleteCategory(id: string): Promise<void> {
  return getActualConnection().run(() => api.deleteCategory(id));
}

/**
 * Creates a category group and returns its identifier.
 */
export function createCategoryGroup(args: Record<string, unknown>): Promise<string> {
  return getActualConnection().run(() =>
    api.createCategoryGroup(args as unknown as Omit<APICategoryGroupEntity, 'id'>)
  );
}

/**
 * Updates a category group with the supplied fields.
 */
export function updateCategoryGroup(id: string, args: Record<string, unknown>): Promise<unknown> {
  return getActualConnection().run(() => api.updateCategoryGroup(id, args));
}

/**
 * Deletes a category group by identifier.
 */
export function deleteCategoryGroup(id: string): Promise<unknown> {
  return getActualConnection().run(() => api.deleteCategoryGroup(id));
}

/**
 * Adds a transaction to an account and returns its identifier.
 */
export function createTransaction(accountId: string, data: TransactionData): Promise<string> {
  return getActualConnection().run(() => api.addTransactions(accountId, [data], { runTransfers: true }));
}

/**
 * Imports transactions using Actual's reconciliation and deduplication logic.
 */
export function importTransactions(
  accountId: string,
  transactions: ImportTransactionEntity[],
  opts?: { defaultCleared?: boolean; dryRun?: boolean }
): Promise<{ added: string[]; updated: string[]; errors: Array<{ message: string }> }> {
  return getActualConnection().run(() => api.importTransactions(accountId, transactions, opts));
}

/**
 * Updates a transaction with the supplied fields.
 */
export function updateTransaction(id: string, data: UpdateTransactionData): Promise<unknown> {
  return getActualConnection().run(() => api.updateTransaction(id, data as unknown as Partial<TransactionEntity>));
}

/**
 * Deletes a transaction by identifier.
 */
export function deleteTransaction(id: string): Promise<unknown> {
  return getActualConnection().run(() => api.deleteTransaction(id));
}

/**
 * Runs bank synchronization for one account or all linked accounts.
 */
export function runBankSync(accountId?: string): Promise<void> {
  return getActualConnection().run(() => api.runBankSync(accountId ? { accountId } : undefined));
}

/**
 * Invokes an Actual server handler through the initialized connection handle.
 */
async function send<K extends keyof Handlers>(name: K, args?: Parameters<Handlers[K]>[0]): Promise<unknown> {
  return getActualConnection().run((actualLib) => actualLib.send(name, args));
}

/**
 * Selects every row from an Actual query table.
 */
async function query<T>(tableName: string): Promise<T[]> {
  return getActualConnection().run(async (actualLib) => {
    const result = (await api.aqlQuery(actualLib.q(tableName).select('*'))) as { data: T[] };
    return result.data ?? [];
  });
}

/**
 * Returns every custom report in the loaded budget.
 */
export async function getReports(): Promise<CustomReportEntity[]> {
  return (await send('report/get')) as CustomReportEntity[];
}

/**
 * Creates a custom report and returns its identifier.
 */
export async function createReport(report: CustomReportEntity): Promise<string> {
  return (await send('report/create', report)) as string;
}

/**
 * Updates an existing custom report.
 */
export async function updateReport(report: CustomReportEntity): Promise<void> {
  await send('report/update', report);
}

/**
 * Deletes a custom report by identifier.
 */
export async function deleteReport(id: string): Promise<void> {
  await send('report/delete', id);
}

/**
 * Returns every active dashboard page.
 */
export async function getDashboardPages(): Promise<DashboardPageEntity[]> {
  return (await query<DashboardPageEntity>('dashboard_pages')).filter((page) => !page.tombstone);
}

/**
 * Returns every active dashboard widget.
 */
export async function getDashboardWidgets(): Promise<DashboardWidgetEntity[]> {
  return (await query<DashboardWidgetEntity>('dashboard')).filter((widget) => !widget.tombstone);
}

/**
 * Adds a widget to a dashboard.
 */
export async function addDashboardWidget(widget: Record<string, unknown>): Promise<void> {
  await send('dashboard-add-widget', widget as Parameters<Handlers['dashboard-add-widget']>[0]);
}

/**
 * Updates an existing dashboard widget.
 */
export async function updateDashboardWidget(widget: Record<string, unknown>): Promise<void> {
  await send('dashboard-update-widget', widget as Parameters<Handlers['dashboard-update-widget']>[0]);
}

/**
 * Removes a widget from a dashboard.
 */
export async function removeDashboardWidget(widgetId: string): Promise<void> {
  await send('dashboard-remove-widget', widgetId);
}

/**
 * Replaces the dashboard's widget configuration.
 */
export async function updateDashboard(widgets: Array<Record<string, unknown>>): Promise<void> {
  await send('dashboard-update', widgets as Parameters<Handlers['dashboard-update']>[0]);
}

/**
 * Creates a dashboard page and returns its identifier.
 */
export async function createDashboardPage(name: string): Promise<string> {
  return (await send('dashboard-create', { name })) as string;
}

/**
 * Renames a dashboard page.
 */
export async function renameDashboardPage(id: string, name: string): Promise<void> {
  await send('dashboard-rename', { id, name });
}

/**
 * Deletes a dashboard page by identifier.
 */
export async function deleteDashboardPage(id: string): Promise<void> {
  await send('dashboard-delete', id);
}

/**
 * Sets the budgeted amount for a category and month.
 */
export function setBudgetAmount(month: string, categoryId: string, value: number): Promise<void> {
  return getActualConnection().run(() => api.setBudgetAmount(month, categoryId, value));
}

/**
 * Enables or disables category carryover for a month.
 */
export function setBudgetCarryover(month: string, categoryId: string, flag: boolean): Promise<void> {
  return getActualConnection().run(() => api.setBudgetCarryover(month, categoryId, flag));
}

/**
 * Holds an amount from a month for use in the following month.
 */
export function holdBudgetForNextMonth(month: string, value: number): Promise<boolean> {
  return getActualConnection().run(() => api.holdBudgetForNextMonth(month, value));
}

/**
 * Clears a previously configured budget hold for a month.
 */
export function resetBudgetHold(month: string): Promise<void> {
  return getActualConnection().run(() => api.resetBudgetHold(month));
}
