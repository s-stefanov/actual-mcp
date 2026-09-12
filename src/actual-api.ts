import * as api from '@actual-app/api';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BudgetFile, BudgetMonth, TransactionData, UpdateTransactionData } from './types.js';
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

const DEFAULT_DATA_DIR: string = path.resolve(os.homedir() || '.', '.actual');
const DEFAULT_SYNC_TTL_MS = 60_000;

// API initialization state
let initialized = false;

/**
 * The handle `init` returns, which exposes `send` and `q`.
 *
 * Reason: reports and dashboards have no functions on the public `@actual-app/api`
 * surface; they are only reachable as server handlers through `send`. The package
 * deprecates its `internal` export in favour of this return value, so this is the
 * supported way to get at them.
 */
let actualLib: Awaited<ReturnType<typeof api.init>> | null = null;
let initializing = false;
let initializationError: Error | null = null;
let lastSyncAt = 0;

/**
 * How long downloaded data is considered fresh, in milliseconds.
 * Set ACTUAL_SYNC_TTL_MS to 0 to sync before every call, or to a negative
 * value to disable automatic syncing entirely.
 */
function syncTtlMs(): number {
  const raw = process.env.ACTUAL_SYNC_TTL_MS;
  if (raw === undefined || raw === '') return DEFAULT_SYNC_TTL_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_SYNC_TTL_MS;
}

/**
 * Pull changes made elsewhere (web UI, mobile, other clients) into the local
 * budget file.
 *
 * `downloadBudget` only runs once, at initialization, so without this a
 * long-running server keeps answering from the snapshot it started with:
 * transactions added later are silently invisible. That is especially easy to
 * hit over SSE/HTTP, where a single process serves requests for days.
 *
 * A failed sync is logged but not thrown: answering from slightly stale data
 * beats failing the tool call outright.
 */
async function syncIfStale(): Promise<void> {
  const ttl = syncTtlMs();
  if (ttl < 0) return;
  if (Date.now() - lastSyncAt < ttl) return;

  try {
    await api.sync();
    lastSyncAt = Date.now();
  } catch (error) {
    console.error('Failed to sync with Actual server, continuing with local data:', error);
  }
}

/**
 * Initialize the Actual Budget API
 */
export async function initActualApi(): Promise<void> {
  if (initialized) {
    await syncIfStale();
    return;
  }
  if (initializing) {
    // Wait for initialization to complete if already in progress
    while (initializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (initializationError) throw initializationError;
    return;
  }

  initializing = true;
  try {
    console.error('Initializing Actual Budget API...');
    const dataDir = process.env.ACTUAL_DATA_DIR || DEFAULT_DATA_DIR;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const serverURL = process.env.ACTUAL_SERVER_URL;
    const password = process.env.ACTUAL_PASSWORD;
    // Reason: InitConfig is a discriminated union in 26.x — NoServerConfig forbids serverURL/password
    const initConfig = serverURL ? { dataDir, serverURL, password: password ?? '' } : { dataDir };
    actualLib = await api.init(initConfig);

    const budgets: BudgetFile[] = await api.getBudgets();
    if (!budgets || budgets.length === 0) {
      throw new Error('No budgets found. Please create a budget in Actual first.');
    }

    // Use specified budget or the first one
    const budgetId: string = process.env.ACTUAL_BUDGET_SYNC_ID || budgets[0].cloudFileId || budgets[0].id || '';
    console.error(`Loading budget: ${budgetId}`);
    await api.downloadBudget(
      budgetId,
      process.env.ACTUAL_BUDGET_ENCRYPTION_PASSWORD
        ? {
            password: process.env.ACTUAL_BUDGET_ENCRYPTION_PASSWORD,
          }
        : undefined
    );

    initialized = true;
    lastSyncAt = Date.now();
    console.error('Actual Budget API initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Actual Budget API:', error);
    initializationError = error instanceof Error ? error : new Error(String(error));
    throw initializationError;
  } finally {
    initializing = false;
  }
}

/**
 * Shutdown the Actual Budget API
 */
export async function shutdownActualApi(): Promise<void> {
  if (!initialized) return;
  try {
    await api.shutdown();
  } catch (err) {
    console.error('Error shutting down Actual Budget API:', err);
  } finally {
    initialized = false;
    lastSyncAt = 0;
    actualLib = null;
  }
}

// ----------------------------
// FETCH
// ----------------------------

/**
 * Get all accounts (ensures API is initialized)
 */
export async function getAccounts(): Promise<APIAccountEntity[]> {
  await initActualApi();
  return api.getAccounts();
}

/**
 * Get all categories (ensures API is initialized)
 */
export async function getCategories(): Promise<(APICategoryEntity | APICategoryGroupEntity)[]> {
  await initActualApi();
  return api.getCategories();
}

/**
 * Get all category groups (ensures API is initialized)
 */
export async function getCategoryGroups(): Promise<APICategoryGroupEntity[]> {
  await initActualApi();
  return api.getCategoryGroups();
}

/**
 * Get all payees (ensures API is initialized)
 */
export async function getPayees(): Promise<APIPayeeEntity[]> {
  await initActualApi();
  return api.getPayees();
}

/**
 * Get transactions for a specific account and date range (ensures API is initialized)
 */
export async function getTransactions(accountId: string, start: string, end: string): Promise<TransactionEntity[]> {
  await initActualApi();
  return api.getTransactions(accountId, start, end);
}

/**
 * Get the list of months the budget has data for, as `YYYY-MM` strings
 * (ensures API is initialized)
 */
export async function getBudgetMonths(): Promise<string[]> {
  await initActualApi();
  return api.getBudgetMonths();
}

/**
 * Get budgeted/spent/balance figures for a single `YYYY-MM` month
 * (ensures API is initialized)
 */
export async function getBudgetMonth(month: string): Promise<BudgetMonth> {
  await initActualApi();
  // Reason: the API types category groups as Record<string, unknown>; BudgetMonth names
  // the fields it actually returns so callers do not re-cast at every use site.
  return api.getBudgetMonth(month) as unknown as Promise<BudgetMonth>;
}

/**
 * Get an account balance as of a cutoff date (ensures API is initialized)
 */
export async function getAccountBalance(id: string, cutoff: Date): Promise<number> {
  await initActualApi();
  return api.getAccountBalance(id, cutoff);
}

/**
 * Get all rules (ensures API is initialized)
 */
export async function getRules(): Promise<RuleEntity[]> {
  await initActualApi();
  return api.getRules();
}

// ----------------------------
// ACTION
// ----------------------------

/**
 * Create a new payee (ensures API is initialized)
 */
export async function createPayee(args: Record<string, unknown>): Promise<string> {
  await initActualApi();
  return api.createPayee(args as unknown as Omit<APIPayeeEntity, 'id'>);
}

/**
 * Update a payee (ensures API is initialized)
 */
export async function updatePayee(id: string, args: Record<string, unknown>): Promise<unknown> {
  await initActualApi();
  return api.updatePayee(id, args);
}

/**
 * Delete a payee (ensures API is initialized)
 */
export async function deletePayee(id: string): Promise<unknown> {
  await initActualApi();
  return api.deletePayee(id);
}

/**
 * Create a new rule (ensures API is initialized)
 */
export async function createRule(args: Record<string, unknown>): Promise<RuleEntity> {
  await initActualApi();
  return api.createRule(args as unknown as Omit<RuleEntity, 'id'>);
}

/**
 * Update a rule (ensures API is initialized)
 */
export async function updateRule(args: Record<string, unknown>): Promise<RuleEntity> {
  await initActualApi();
  return api.updateRule(args as unknown as RuleEntity);
}

/**
 * Delete a rule (ensures API is initialized)
 */
export async function deleteRule(id: string): Promise<boolean> {
  await initActualApi();
  return api.deleteRule(id);
}

/**
 * Create a new category (ensures API is initialized)
 */
export async function createCategory(args: Record<string, unknown>): Promise<string> {
  await initActualApi();
  return api.createCategory(args as unknown as Omit<APICategoryEntity, 'id'>);
}

/**
 * Update a category (ensures API is initialized)
 */
export async function updateCategory(id: string, args: Record<string, unknown>): Promise<unknown> {
  await initActualApi();
  return api.updateCategory(id, args);
}

/**
 * Delete a category (ensures API is initialized)
 */
export async function deleteCategory(id: string): Promise<void> {
  await initActualApi();
  return api.deleteCategory(id);
}

/**
 * Create a new category group (ensures API is initialized)
 */
export async function createCategoryGroup(args: Record<string, unknown>): Promise<string> {
  await initActualApi();
  return api.createCategoryGroup(args as unknown as Omit<APICategoryGroupEntity, 'id'>);
}

/**
 * Update a category group (ensures API is initialized)
 */
export async function updateCategoryGroup(id: string, args: Record<string, unknown>): Promise<unknown> {
  await initActualApi();
  return api.updateCategoryGroup(id, args);
}

/**
 * Delete a category group (ensures API is initialized)
 */
export async function deleteCategoryGroup(id: string): Promise<unknown> {
  await initActualApi();
  return api.deleteCategoryGroup(id);
}

/**
 * Create a transaction (ensures API is initialized).
 * Passes runTransfers so that transfer payees automatically create the counterpart transaction.
 */
export async function createTransaction(accountId: string, data: TransactionData): Promise<string> {
  await initActualApi();
  return api.addTransactions(accountId, [data], { runTransfers: true });
}

/**
 * Import a list of transactions using Actual's reconciliation logic.
 * Deduplicates via imported_id and optionally supports dry-run validation.
 */
export async function importTransactions(
  accountId: string,
  transactions: ImportTransactionEntity[],
  opts?: { defaultCleared?: boolean; dryRun?: boolean }
): Promise<{ added: string[]; updated: string[]; errors: Array<{ message: string }> }> {
  await initActualApi();
  return api.importTransactions(accountId, transactions, opts);
}

/**
 * Update a transaction (ensures API is initialized)
 */
export async function updateTransaction(id: string, data: UpdateTransactionData): Promise<unknown> {
  await initActualApi();
  return api.updateTransaction(id, data as unknown as Partial<TransactionEntity>);
}

/**
 * Delete a transaction (ensures API is initialized)
 */
export async function deleteTransaction(id: string): Promise<unknown> {
  await initActualApi();
  return api.deleteTransaction(id);
}

/**
 * Run bank sync for accounts (ensures API is initialized)
 *
 * @param accountId - Optional. Specific account ID, or special value:
 *   - "onbudget": sync all on-budget linked accounts
 *   - "offbudget": sync all off-budget linked accounts
 *   - undefined: sync ALL linked accounts
 */
export async function runBankSync(accountId?: string): Promise<void> {
  await initActualApi();
  // API expects { accountId } object or undefined for all accounts
  return api.runBankSync(accountId ? { accountId } : undefined);
}

// ----------------------------
// REPORTS & DASHBOARDS
// ----------------------------

/**
 * Invoke an Actual server handler by name.
 *
 * @param name - Handler name, e.g. `report/create`
 * @param args - Arguments for that handler
 * @returns Whatever the handler resolves to
 */
async function send<K extends keyof Handlers>(name: K, args?: Parameters<Handlers[K]>[0]): Promise<unknown> {
  await initActualApi();
  if (!actualLib) {
    throw new Error('Actual API is not initialized');
  }
  return actualLib.send(name, args);
}

/**
 * Run an AQL query against the loaded budget.
 *
 * Reason: dashboards have no read handler, so widgets and pages are read with
 * AQL, which also parses `meta` into an object and `tombstone` into a boolean.
 */
async function query<T>(tableName: string): Promise<T[]> {
  await initActualApi();
  if (!actualLib) {
    throw new Error('Actual API is not initialized');
  }
  const result = (await api.aqlQuery(actualLib.q(tableName).select('*'))) as { data: T[] };
  return result.data ?? [];
}

/**
 * Get all saved custom reports (ensures API is initialized)
 */
export async function getReports(): Promise<CustomReportEntity[]> {
  return (await send('report/get')) as CustomReportEntity[];
}

/**
 * Create a saved custom report (ensures API is initialized)
 */
export async function createReport(report: CustomReportEntity): Promise<string> {
  return (await send('report/create', report)) as string;
}

/**
 * Update a saved custom report (ensures API is initialized)
 */
export async function updateReport(report: CustomReportEntity): Promise<void> {
  await send('report/update', report);
}

/**
 * Delete a saved custom report (ensures API is initialized)
 */
export async function deleteReport(id: string): Promise<void> {
  await send('report/delete', id);
}

/**
 * Get all dashboard pages (ensures API is initialized)
 */
export async function getDashboardPages(): Promise<DashboardPageEntity[]> {
  const pages = await query<DashboardPageEntity>('dashboard_pages');
  return pages.filter((page) => !page.tombstone);
}

/**
 * Get all dashboard widgets across every page (ensures API is initialized)
 */
export async function getDashboardWidgets(): Promise<DashboardWidgetEntity[]> {
  const widgets = await query<DashboardWidgetEntity>('dashboard');
  return widgets.filter((widget) => !widget.tombstone);
}

/**
 * Add a widget to a dashboard page (ensures API is initialized)
 */
export async function addDashboardWidget(widget: Record<string, unknown>): Promise<void> {
  await send('dashboard-add-widget', widget as Parameters<Handlers['dashboard-add-widget']>[0]);
}

/**
 * Update a single dashboard widget in place (ensures API is initialized)
 */
export async function updateDashboardWidget(widget: Record<string, unknown>): Promise<void> {
  await send('dashboard-update-widget', widget as Parameters<Handlers['dashboard-update-widget']>[0]);
}

/**
 * Remove a widget from its dashboard page (ensures API is initialized)
 */
export async function removeDashboardWidget(widgetId: string): Promise<void> {
  await send('dashboard-remove-widget', widgetId);
}

/**
 * Apply position and size updates to many widgets at once (ensures API is initialized)
 */
export async function updateDashboard(widgets: Array<Record<string, unknown>>): Promise<void> {
  await send('dashboard-update', widgets as Parameters<Handlers['dashboard-update']>[0]);
}

/**
 * Create a new dashboard page (ensures API is initialized)
 */
export async function createDashboardPage(name: string): Promise<string> {
  return (await send('dashboard-create', { name })) as string;
}

/**
 * Rename an existing dashboard page (ensures API is initialized)
 */
export async function renameDashboardPage(id: string, name: string): Promise<void> {
  await send('dashboard-rename', { id, name });
}

/**
 * Delete a dashboard page and the widgets on it (ensures API is initialized)
 */
export async function deleteDashboardPage(id: string): Promise<void> {
  await send('dashboard-delete', id);
}

// ----------------------------
// BUDGETS
// ----------------------------

/**
 * Set the budgeted amount for a category in a given month (ensures API is initialized)
 *
 * @param month - Month in YYYY-MM format
 * @param categoryId - ID of the category
 * @param value - Amount in integer cents (e.g. 12030 = $120.30)
 */
export async function setBudgetAmount(month: string, categoryId: string, value: number): Promise<void> {
  await initActualApi();
  return api.setBudgetAmount(month, categoryId, value);
}

/**
 * Enable or disable carryover for a category in a given month (ensures API is initialized)
 *
 * @param month - Month in YYYY-MM format
 * @param categoryId - ID of the category
 * @param flag - true to enable carryover, false to disable
 */
export async function setBudgetCarryover(month: string, categoryId: string, flag: boolean): Promise<void> {
  await initActualApi();
  return api.setBudgetCarryover(month, categoryId, flag);
}

/**
 * Hold budget funds for the next month (ensures API is initialized)
 *
 * @param month - Month in YYYY-MM format
 * @param value - Amount in integer cents to hold
 */
export async function holdBudgetForNextMonth(month: string, value: number): Promise<boolean> {
  await initActualApi();
  return api.holdBudgetForNextMonth(month, value);
}

/**
 * Reset any held budget amounts for a month (ensures API is initialized)
 *
 * @param month - Month in YYYY-MM format
 */
export async function resetBudgetHold(month: string): Promise<void> {
  await initActualApi();
  return api.resetBudgetHold(month);
}
