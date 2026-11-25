// ----------------------------
// CREATE SCHEDULE TOOL
// ----------------------------

import { createSchedule } from '../../../actual-automation-api.js';
import type { APIScheduleEntity } from '../../../actual-automation-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { parseScheduleFields, schedulePropertySchemas } from '../schedule-input.js';

export const schema = {
  name: 'create-schedule',
  description:
    'Create a schedule for a recurring or one-off bill, so Actual matches the transaction when it arrives ' +
    'and budget templates can refer to it by name.',
  inputSchema: {
    type: 'object',
    properties: schedulePropertySchemas,
    required: ['name', 'account', 'payee', 'amount', 'date'],
    additionalProperties: false,
  },
};

/**
 * Validates the arguments and creates the schedule.
 *
 * @param args - Schedule fields (see schedulePropertySchemas)
 * @returns The new schedule's ID, or an error response
 */
export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    for (const key of schema.inputSchema.required) {
      if (args[key] === undefined) {
        return errorFromCatch(`${key} is required`);
      }
    }
    const parsed = parseScheduleFields({ amountOp: 'isapprox', ...args });
    if ('error' in parsed) {
      return errorFromCatch(parsed.error);
    }

    const id = await createSchedule({
      posts_transaction: false,
      ...parsed.fields,
    } as Omit<APIScheduleEntity, 'id'>);

    return successWithJson({ id, message: `Created schedule "${parsed.fields.name}"` });
  } catch (err) {
    return errorFromCatch(err);
  }
}
