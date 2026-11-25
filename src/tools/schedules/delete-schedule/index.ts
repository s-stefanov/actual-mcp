// ----------------------------
// DELETE SCHEDULE TOOL
// ----------------------------

import { deleteSchedule } from '../../../actual-automation-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';

export const schema = {
  name: 'delete-schedule',
  description:
    'Permanently delete a schedule and its rule. To stop a finished bill, prefer update-schedule with completed: true.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Schedule ID (UUID).' },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

/**
 * Deletes a schedule by ID.
 *
 * @param args - Tool arguments containing `id`
 * @returns A success message, or an error response
 */
export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.id || typeof args.id !== 'string') {
      return errorFromCatch('id is required and must be a string');
    }
    await deleteSchedule(args.id);
    return successWithJson(`Deleted schedule ${args.id}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
