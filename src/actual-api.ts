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

/** @deprecated Use getActualConnection().ensureReady(). */
export function initActualApi(): Promise<void> {
  return getActualConnection().ensureReady();
}

/** @deprecated Use getActualConnection().drainAndClose(). */
export function shutdownActualApi(): Promise<void> {
  return getActualConnection().drainAndClose();
}

export function getAccounts(): Promise<APIAccountEntity[]> {
  return getActualConnection().run(() => api.getAccounts());
}

export function getCategories(): Promise<(APICategoryEntity | APICategoryGroupEntity)[]> {
  return getActualConnection().run(() => api.getCategories());
}

export function getCategoryGroups(): Promise<APICategoryGroupEntity[]> {
  return getActualConnection().run(() => api.getCategoryGroups());
}

export function getPayees(): Promise<APIPayeeEntity[]> {
  return getActualConnection().run(() => api.getPayees());
}

export function getTransactions(accountId: string, start: string, end: string): Promise<TransactionEntity[]> {
  return getActualConnection().run(() => api.getTransactions(accountId, start, end));
}

export function getBudgetMonths(): Promise<string[]> {
  return getActualConnection().run(() => api.getBudgetMonths());
}

export function getBudgetMonth(month: string): Promise<BudgetMonth> {
  return getActualConnection().run(() => api.getBudgetMonth(month) as unknown as Promise<BudgetMonth>);
}

export function getAccountBalance(accountId: string, cutoff?: Date): Promise<number> {
  return getActualConnection().run(() => api.getAccountBalance(accountId, cutoff));
}

export function getRules(): Promise<RuleEntity[]> {
  return getActualConnection().run(() => api.getRules());
}

export function createPayee(args: Record<string, unknown>): Promise<string> {
  return getActualConnection().run(() => api.createPayee(args as unknown as Omit<APIPayeeEntity, 'id'>));
}

export function updatePayee(id: string, args: Record<string, unknown>): Promise<unknown> {
  return getActualConnection().run(() => api.updatePayee(id, args));
}

export function deletePayee(id: string): Promise<unknown> {
  return getActualConnection().run(() => api.deletePayee(id));
}

export function createRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return getActualConnection().run(() => api.createRule(args as unknown as Omit<RuleEntity, 'id'>));
}

export function updateRule(args: Record<string, unknown>): Promise<RuleEntity> {
  return getActualConnection().run(() => api.updateRule(args as unknown as RuleEntity));
}

export function deleteRule(id: string): Promise<boolean> {
  return getActualConnection().run(() => api.deleteRule(id));
}

export function createCategory(args: Record<string, unknown>): Promise<string> {
  return getActualConnection().run(() => api.createCategory(args as unknown as Omit<APICategoryEntity, 'id'>));
}

export function updateCategory(id: string, args: Record<string, unknown>): Promise<unknown> {
  return getActualConnection().run(() => api.updateCategory(id, args));
}

export function deleteCategory(id: string): Promise<void> {
  return getActualConnection().run(() => api.deleteCategory(id));
}

export function createCategoryGroup(args: Record<string, unknown>): Promise<string> {
  return getActualConnection().run(() =>
    api.createCategoryGroup(args as unknown as Omit<APICategoryGroupEntity, 'id'>)
  );
}

export function updateCategoryGroup(id: string, args: Record<string, unknown>): Promise<unknown> {
  return getActualConnection().run(() => api.updateCategoryGroup(id, args));
}

export function deleteCategoryGroup(id: string): Promise<unknown> {
  return getActualConnection().run(() => api.deleteCategoryGroup(id));
}

export function createTransaction(accountId: string, data: TransactionData): Promise<string> {
  return getActualConnection().run(() => api.addTransactions(accountId, [data], { runTransfers: true }));
}

export function importTransactions(
  accountId: string,
  transactions: ImportTransactionEntity[],
  opts?: { defaultCleared?: boolean; dryRun?: boolean }
): Promise<{ added: string[]; updated: string[]; errors: Array<{ message: string }> }> {
  return getActualConnection().run(() => api.importTransactions(accountId, transactions, opts));
}

export function updateTransaction(id: string, data: UpdateTransactionData): Promise<unknown> {
  return getActualConnection().run(() => api.updateTransaction(id, data as unknown as Partial<TransactionEntity>));
}

export function deleteTransaction(id: string): Promise<unknown> {
  return getActualConnection().run(() => api.deleteTransaction(id));
}

export function runBankSync(accountId?: string): Promise<void> {
  return getActualConnection().run(() => api.runBankSync(accountId ? { accountId } : undefined));
}

async function send<K extends keyof Handlers>(name: K, args?: Parameters<Handlers[K]>[0]): Promise<unknown> {
  return getActualConnection().run((actualLib) => actualLib.send(name, args));
}

async function query<T>(tableName: string): Promise<T[]> {
  return getActualConnection().run(async (actualLib) => {
    const result = (await api.aqlQuery(actualLib.q(tableName).select('*'))) as { data: T[] };
    return result.data ?? [];
  });
}

export async function getReports(): Promise<CustomReportEntity[]> {
  return (await send('report/get')) as CustomReportEntity[];
}

export async function createReport(report: CustomReportEntity): Promise<string> {
  return (await send('report/create', report)) as string;
}

export async function updateReport(report: CustomReportEntity): Promise<void> {
  await send('report/update', report);
}

export async function deleteReport(id: string): Promise<void> {
  await send('report/delete', id);
}

export async function getDashboardPages(): Promise<DashboardPageEntity[]> {
  return (await query<DashboardPageEntity>('dashboard_pages')).filter((page) => !page.tombstone);
}

export async function getDashboardWidgets(): Promise<DashboardWidgetEntity[]> {
  return (await query<DashboardWidgetEntity>('dashboard')).filter((widget) => !widget.tombstone);
}

export async function addDashboardWidget(widget: Record<string, unknown>): Promise<void> {
  await send('dashboard-add-widget', widget as Parameters<Handlers['dashboard-add-widget']>[0]);
}

export async function updateDashboardWidget(widget: Record<string, unknown>): Promise<void> {
  await send('dashboard-update-widget', widget as Parameters<Handlers['dashboard-update-widget']>[0]);
}

export async function removeDashboardWidget(widgetId: string): Promise<void> {
  await send('dashboard-remove-widget', widgetId);
}

export async function updateDashboard(widgets: Array<Record<string, unknown>>): Promise<void> {
  await send('dashboard-update', widgets as Parameters<Handlers['dashboard-update']>[0]);
}

export async function createDashboardPage(name: string): Promise<string> {
  return (await send('dashboard-create', { name })) as string;
}

export async function renameDashboardPage(id: string, name: string): Promise<void> {
  await send('dashboard-rename', { id, name });
}

export async function deleteDashboardPage(id: string): Promise<void> {
  await send('dashboard-delete', id);
}

export function setBudgetAmount(month: string, categoryId: string, value: number): Promise<void> {
  return getActualConnection().run(() => api.setBudgetAmount(month, categoryId, value));
}

export function setBudgetCarryover(month: string, categoryId: string, flag: boolean): Promise<void> {
  return getActualConnection().run(() => api.setBudgetCarryover(month, categoryId, flag));
}

export function holdBudgetForNextMonth(month: string, value: number): Promise<boolean> {
  return getActualConnection().run(() => api.holdBudgetForNextMonth(month, value));
}

export function resetBudgetHold(month: string): Promise<void> {
  return getActualConnection().run(() => api.resetBudgetHold(month));
}
