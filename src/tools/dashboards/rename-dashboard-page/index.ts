// ----------------------------
// RENAME DASHBOARD PAGE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { renameDashboardPage } from '../../../actual-api.js';

export const schema = {
  name: 'rename-dashboard-page',
  description: 'Rename an existing dashboard page',
  inputSchema: {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'string', description: 'ID of the dashboard page to rename' },
      name: { type: 'string', description: 'New name for the page' },
    },
    additionalProperties: false,
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { id, name } = args as { id?: string; name?: string };
    if (!id) {
      throw new Error('id is required');
    }
    if (!name) {
      throw new Error('name is required');
    }

    await renameDashboardPage(id, name);

    return successWithJson('Successfully renamed dashboard page ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
