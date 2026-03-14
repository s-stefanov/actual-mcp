// ----------------------------
// DELETE SCHEDULE TOOL
// ----------------------------

import { deleteSchedule } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';

export const schema = {
  name: 'delete-schedule',
  description: 'Delete a schedule',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the schedule. Should be in UUID format.',
      },
    },
    required: ['id'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.id || typeof args.id !== 'string') {
      return errorFromCatch('id is required and must be a string');
    }

    await deleteSchedule(args.id);

    return successWithJson('Successfully deleted schedule ' + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
