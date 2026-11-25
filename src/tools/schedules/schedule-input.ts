// ----------------------------
// SCHEDULE INPUT: shared JSON schema and validation for create/update-schedule
// ----------------------------

import type { APIScheduleEntity } from '../../actual-automation-api.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];
const AMOUNT_OPS = ['is', 'isapprox', 'isbetween'];
const END_MODES = ['never', 'after_n_occurrences', 'on_date'];

export const schedulePropertySchemas = {
  name: {
    type: 'string',
    description: 'Unique schedule name. Budget templates refer to schedules by this name (#template schedule <name>).',
  },
  account: { type: 'string', description: 'Account ID the payment comes from or goes to (UUID).' },
  payee: { type: 'string', description: 'Payee ID (UUID).' },
  amount: {
    description:
      'Amount in integer cents: negative for a payment, positive for a deposit (e.g. -4550 = -45.50). ' +
      'With amountOp "isbetween", an object {num1, num2}.',
    oneOf: [
      { type: 'number' },
      {
        type: 'object',
        properties: { num1: { type: 'number' }, num2: { type: 'number' } },
        required: ['num1', 'num2'],
      },
    ],
  },
  amountOp: {
    type: 'string',
    enum: AMOUNT_OPS,
    description:
      'How strictly the amount must match: "is", "isapprox" (±7.5%), or "isbetween". Default "isapprox" on create; ' +
      'on update, pass it together with amount.',
  },
  date: {
    description:
      'A one-off date "YYYY-MM-DD", or a recurrence: {frequency: daily|weekly|monthly|yearly, interval (default 1), ' +
      'start "YYYY-MM-DD", endMode: never|after_n_occurrences|on_date, endOccurrences, endDate, skipWeekend, ' +
      'weekendSolveMode: before|after}.',
    oneOf: [
      { type: 'string', pattern: DATE_PATTERN.source },
      {
        type: 'object',
        properties: {
          frequency: { type: 'string', enum: FREQUENCIES },
          interval: { type: 'number' },
          start: { type: 'string', pattern: DATE_PATTERN.source },
          endMode: { type: 'string', enum: END_MODES },
          endOccurrences: { type: 'number' },
          endDate: { type: 'string', pattern: DATE_PATTERN.source },
          skipWeekend: { type: 'boolean' },
          weekendSolveMode: { type: 'string', enum: ['before', 'after'] },
        },
        required: ['frequency', 'start'],
      },
    ],
  },
  posts_transaction: {
    type: 'boolean',
    description: 'Let Actual add the transaction automatically on its date. Default false.',
  },
};

/**
 * Validates a schedule's date: a YYYY-MM-DD string or a recurrence object.
 *
 * @returns An error message, or null when valid
 */
function dateError(date: unknown): string | null {
  if (typeof date === 'string') {
    return DATE_PATTERN.test(date) ? null : 'date must be YYYY-MM-DD';
  }
  if (!date || typeof date !== 'object') {
    return 'date must be a YYYY-MM-DD string or a recurrence object';
  }
  const recur = date as Record<string, unknown>;
  if (typeof recur.frequency !== 'string' || !FREQUENCIES.includes(recur.frequency)) {
    return `date.frequency must be one of ${FREQUENCIES.join(', ')}`;
  }
  if (typeof recur.start !== 'string' || !DATE_PATTERN.test(recur.start)) {
    return 'date.start must be YYYY-MM-DD';
  }
  if (recur.endMode !== undefined && !END_MODES.includes(recur.endMode as string)) {
    return `date.endMode must be one of ${END_MODES.join(', ')}`;
  }
  return null;
}

/**
 * Validates an amount against its operator.
 *
 * @returns An error message, or null when valid
 */
function amountError(amount: unknown, amountOp: unknown): string | null {
  if (amountOp === 'isbetween') {
    const range = amount as { num1?: unknown; num2?: unknown } | null;
    return range && Number.isInteger(range.num1) && Number.isInteger(range.num2)
      ? null
      : 'with amountOp "isbetween", amount must be {num1, num2} in integer cents';
  }
  return Number.isInteger(amount) ? null : 'amount must be an integer number of cents';
}

/**
 * Picks the schedule fields present in the tool arguments and validates them.
 *
 * @param args - Raw tool arguments
 * @returns The validated fields, or an error message
 */
export function parseScheduleFields(
  args: Record<string, unknown>
): { fields: Partial<APIScheduleEntity> } | { error: string } {
  const fields: Partial<APIScheduleEntity> = {};

  if (args.name !== undefined) {
    if (typeof args.name !== 'string' || args.name.trim() === '') {
      return { error: 'name must be a non-empty string' };
    }
    fields.name = args.name.trim();
  }
  for (const key of ['account', 'payee'] as const) {
    if (args[key] !== undefined) {
      if (typeof args[key] !== 'string' || args[key] === '') {
        return { error: `${key} must be an ID string` };
      }
      fields[key] = args[key] as string;
    }
  }
  if (args.amountOp !== undefined) {
    if (!AMOUNT_OPS.includes(args.amountOp as string)) {
      return { error: `amountOp must be one of ${AMOUNT_OPS.join(', ')}` };
    }
    fields.amountOp = args.amountOp as APIScheduleEntity['amountOp'];
  }
  if (args.amount !== undefined) {
    const problem = amountError(args.amount, args.amountOp);
    if (problem) {
      return { error: problem };
    }
    fields.amount = args.amount as APIScheduleEntity['amount'];
  }
  if (args.date !== undefined) {
    const problem = dateError(args.date);
    if (problem) {
      return { error: problem };
    }
    fields.date = args.date as APIScheduleEntity['date'];
  }
  if (args.posts_transaction !== undefined) {
    if (typeof args.posts_transaction !== 'boolean') {
      return { error: 'posts_transaction must be a boolean' };
    }
    fields.posts_transaction = args.posts_transaction;
  }

  return { fields };
}
