// ----------------------------
// REMOVE DASHBOARD WIDGET TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { removeDashboardWidget } from '../../../actual-api.js';

export const schema = {
  name: 'remove-dashboard-widget',
  description: 'Remove a widget from its dashboard page',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'ID of the widget to remove' },
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

    await removeDashboardWidget(id);

    return successWithJson('Successfully removed widget ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
