// ----------------------------
// TEMPLATE RESULT: turns Actual's template notification into a plain answer
// ----------------------------

import type { TemplateNotification } from '../../actual-automation-api.js';

export interface TemplateResult {
  /** True when every template parsed (check) or the month was filled without errors (apply). */
  ok: boolean;
  /** Actual's status code, e.g. templates-check-passed, templates-applied, templates-up-to-date, template-errors. */
  status: string;
  /** One entry per invalid template line, as "<category>: <problem>". */
  errors: string[];
  /** How many categories were budgeted (apply only). */
  applied?: number;
}

const OK_STATUSES = new Set(['templates-check-passed', 'templates-applied', 'templates-up-to-date']);

/**
 * Converts Actual's notification into a result an agent can act on.
 *
 * @param notification - What budget/check-templates or an apply handler returned
 * @returns ok flag, status code, the list of template errors and, for apply, the count
 */
export function toTemplateResult(notification: TemplateNotification): TemplateResult {
  const status = typeof notification.message === 'string' ? notification.message : 'unknown';
  const errors = notification.pre ? notification.pre.split('\n\n').filter((line) => line.trim() !== '') : [];
  const result: TemplateResult = { ok: OK_STATUSES.has(status) && errors.length === 0, status, errors };
  if (status === 'templates-applied' || status === 'templates-up-to-date') {
    result.applied = notification.count ?? 0;
  }
  return result;
}
