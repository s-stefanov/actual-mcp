// ----------------------------
// DELETE CUSTOM REPORT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { deleteReport } from '../../../actual-api.js';

export const schema = {
  name: 'delete-custom-report',
  description: 'Delete a saved custom report',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'ID of the report to delete' },
    },
    additionalProperties: false,
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { id } = args as { id?: string };
    if (!id) {
      throw new Error('id is required');
    }

    await deleteReport(id);

    return successWithJson('Successfully deleted report ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
