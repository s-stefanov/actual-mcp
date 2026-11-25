// ----------------------------
// ACTUAL API: SCHEDULES, NOTES, BUDGET TEMPLATES, PREFERENCES, RECONCILIATION
// ----------------------------
// Reason: kept apart from actual-api.ts so neither file grows past the 500-line limit.

import * as api from '@actual-app/api';
import type { APIScheduleEntity } from '@actual-app/core/server/api-models';
import type { Handlers } from '@actual-app/core/types/handlers';
import type { NoteEntity, TransactionEntity } from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
import { getActualConnection } from './integrations/actual/connection.js';

export type { APIScheduleEntity };

/** Result Actual returns after checking or applying budget templates. */
export interface TemplateNotification {
  type?: 'message' | 'error' | 'warning';
  pre?: string;
  title?: string;
  message: unknown;
  sticky?: boolean;
  count?: number;
}

/**
 * Invokes an Actual server handler through the initialized connection handle.
 */
async function send<K extends keyof Handlers>(name: K, args?: Parameters<Handlers[K]>[0]): Promise<unknown> {
  return getActualConnection().run((actualLib) => actualLib.send(name, args));
}

/**
 * Returns every schedule, including completed ones.
 */
export function getSchedules(): Promise<APIScheduleEntity[]> {
  return getActualConnection().run(() => api.getSchedules());
}

/**
 * Creates a schedule and returns its identifier.
 */
export function createSchedule(schedule: Omit<APIScheduleEntity, 'id'>): Promise<string> {
  return getActualConnection().run(() => api.createSchedule(schedule));
}

/**
 * Updates a schedule's name, payee, account, amount, date or posting flag.
 */
export function updateSchedule(
  id: string,
  fields: Partial<APIScheduleEntity>,
  resetNextDate?: boolean
): Promise<string> {
  return getActualConnection().run(() => api.updateSchedule(id, fields, resetNextDate));
}

/**
 * Marks a schedule completed (or active again), as the UI's Complete button does.
 *
 * Reason: the public API treats `completed` as system-managed and refuses it, so this
 * goes through the same handler the UI uses.
 */
export async function setScheduleCompleted(id: string, completed: boolean): Promise<void> {
  await send('schedule/update', { schedule: { id, completed } });
}

/**
 * Deletes a schedule and its underlying rule.
 */
export function deleteSchedule(id: string): Promise<void> {
  return getActualConnection().run(() => api.deleteSchedule(id));
}

/**
 * Returns every saved note.
 */
export function getAllNotes(): Promise<NoteEntity[]> {
  return getActualConnection().run(async (actualLib) => {
    const result = (await api.aqlQuery(actualLib.q('notes').select('*'))) as { data: NoteEntity[] };
    return result.data ?? [];
  });
}

/**
 * Returns one note by its note ID, or null when none is saved.
 */
export function getNote(id: string): Promise<NoteEntity | null> {
  return getActualConnection().run(() => api.getNote(id));
}

/**
 * Saves a note under a note ID, replacing any existing text.
 */
export function updateNote(id: string, note: string): Promise<void> {
  return getActualConnection().run(() => api.updateNote(id, note));
}

/**
 * Parses every category's `#template` lines and reports any that are invalid.
 */
export async function checkBudgetTemplates(): Promise<TemplateNotification> {
  return (await send('budget/check-templates')) as TemplateNotification;
}

/**
 * Applies budget templates for a month.
 *
 * @param month - Month in YYYY-MM format
 * @param options.categoryIds - Only these categories (always overwrites their budgeted amount)
 * @param options.overwrite - Without categoryIds: also replace amounts that are already budgeted
 */
export async function applyBudgetTemplates(
  month: string,
  options: { categoryIds?: string[]; overwrite?: boolean } = {}
): Promise<TemplateNotification> {
  if (options.categoryIds && options.categoryIds.length > 0) {
    return (await send('budget/apply-multiple-templates', {
      month,
      categoryIds: options.categoryIds,
    })) as TemplateNotification;
  }
  const handler = options.overwrite ? 'budget/overwrite-goal-template' : 'budget/apply-goal-template';
  return (await send(handler, { month })) as TemplateNotification;
}

/**
 * Returns the budget's synced preferences.
 */
export function getPreferences(): Promise<SyncedPrefs> {
  return getActualConnection().run(() => api.getPreferences());
}

/**
 * Sets one synced preference.
 */
export function setPreference(id: keyof SyncedPrefs, value: string): Promise<void> {
  return getActualConnection().run(() => api.setPreference(id, value));
}

/** Outcome of comparing an account's cleared balance with a statement. */
export interface ReconcileOutcome {
  clearedBalance: number;
  /** How many transactions were locked, or null when nothing was locked. */
  locked: number | null;
}

/**
 * Compares the cleared balance up to a date with a statement balance and, when they match
 * (and this is not a dry run), locks those cleared transactions and stamps the account.
 *
 * Reason: the check, the selection and the lock run as one queued connection operation, so a
 * concurrent tool call cannot change the cleared transactions between the comparison and the lock.
 * splits 'none' counts each split at its parent amount, as the account register does.
 */
export function reconcileAccount(
  accountId: string,
  date: string,
  statementBalance: number,
  dryRun: boolean
): Promise<ReconcileOutcome> {
  return getActualConnection().run(async (actualLib) => {
    const cleared = { account: accountId, date: { $lte: date }, cleared: true };
    const sum = (await api.aqlQuery(
      actualLib.q('transactions').filter(cleared).options({ splits: 'none' }).calculate({ $sum: '$amount' })
    )) as { data: number | null };
    const clearedBalance = sum.data ?? 0;
    if (clearedBalance !== statementBalance || dryRun) {
      return { clearedBalance, locked: null };
    }

    const rows = (await api.aqlQuery(
      actualLib
        .q('transactions')
        .filter({ ...cleared, reconciled: false })
        .select('id')
        .options({ splits: 'all' })
    )) as { data: Array<{ id: string }> };
    const ids = (rows.data ?? []).map((row) => row.id);
    if (ids.length > 0) {
      await actualLib.send('transactions-batch-update', {
        updated: ids.map((id) => ({ id, reconciled: true }) as TransactionEntity),
        runTransfers: false,
      });
    }
    await actualLib.send('account-update', { id: accountId, last_reconciled: String(Date.now()) });
    return { clearedBalance, locked: ids.length };
  });
}
