// ----------------------------
// CREATE DASHBOARD PAGE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { createDashboardPage } from '../../../actual-api.js';

export const schema = {
  name: 'create-dashboard-page',
  description: 'Create a new, empty dashboard page',
  inputSchema: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', description: 'Name for the new dashboard page' },
    },
    additionalProperties: false,
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { name } = args as { name?: string };
    if (!name) {
      throw new Error('name is required');
    }

    const id = await createDashboardPage(name);

    return successWithJson('Successfully created dashboard page ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
