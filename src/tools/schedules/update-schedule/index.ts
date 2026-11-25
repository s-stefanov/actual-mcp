// ----------------------------
// UPDATE SCHEDULE TOOL
// ----------------------------

import { setScheduleCompleted, updateSchedule } from '../../../actual-automation-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { parseScheduleFields, schedulePropertySchemas } from '../schedule-input.js';

export const schema = {
  name: 'update-schedule',
  description:
    'Update a schedule: rename it, change its payee, account, amount or recurrence, or mark it completed ' +
    '(to change the amount, send amount and amountOp together) ' +
    '(prefer completing a finished schedule over deleting it, so its history stays linked).',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Schedule ID (UUID).' },
      ...schedulePropertySchemas,
      completed: {
        type: 'boolean',
        description: 'true marks the schedule completed (stops it); false makes it active again.',
      },
      resetNextDate: {
        type: 'boolean',
        description: 'With a field change: recalculate the next date from the (new) recurrence. Default false.',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

/**
 * Applies the given field changes and/or completion state to a schedule.
 *
 * @param args - `id` plus any schedule fields, `completed` and `resetNextDate`
 * @returns A success message, or an error response
 */
export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.id || typeof args.id !== 'string') {
      return errorFromCatch('id is required and must be a string');
    }
    if (args.completed !== undefined && typeof args.completed !== 'boolean') {
      return errorFromCatch('completed must be a boolean');
    }
    const parsed = parseScheduleFields(args);
    if ('error' in parsed) {
      return errorFromCatch(parsed.error);
    }
    // Reason: Actual validates amount against the schedule's operator only when the rule
    // runs, so a lone scalar amount on an "isbetween" schedule (or the reverse) is stored broken.
    if ((args.amount === undefined) !== (args.amountOp === undefined)) {
      return errorFromCatch('Pass amount and amountOp together');
    }
    const hasFields = Object.keys(parsed.fields).length > 0;
    if (args.resetNextDate === true && !hasFields) {
      return errorFromCatch('resetNextDate needs a field change (e.g. date); on its own Actual changes nothing');
    }
    if (!hasFields && args.completed === undefined) {
      return errorFromCatch('Nothing to update: pass at least one field or completed');
    }

    if (hasFields) {
      await updateSchedule(args.id, parsed.fields, args.resetNextDate === true);
    }
    if (typeof args.completed === 'boolean') {
      await setScheduleCompleted(args.id, args.completed);
    }

    return successWithJson(`Updated schedule ${args.id}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
