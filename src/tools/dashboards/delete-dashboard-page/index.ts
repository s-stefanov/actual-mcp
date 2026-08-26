// ----------------------------
// DELETE DASHBOARD PAGE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { deleteDashboardPage, getDashboardPages } from '../../../actual-api.js';

export const schema = {
  name: 'delete-dashboard-page',
  description: 'Delete a dashboard page along with every widget on it',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'ID of the dashboard page to delete' },
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

    // Reason: Actual keeps at least one dashboard page; deleting the last one
    // would leave the Reports area with nothing to render.
    const pages = await getDashboardPages();
    if (!pages.some((page) => page.id === id)) {
      throw new Error(`Dashboard page not found: ${id}`);
    }
    if (pages.length === 1) {
      throw new Error('Cannot delete the only dashboard page');
    }

    await deleteDashboardPage(id);

    return successWithJson('Successfully deleted dashboard page ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
