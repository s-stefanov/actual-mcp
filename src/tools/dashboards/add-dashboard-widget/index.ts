// ----------------------------
// ADD DASHBOARD WIDGET TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { addDashboardWidget, getDashboardPages } from '../../../actual-api.js';
import { AddWidgetInputSchema } from '../input-schema.js';

export const schema = {
  name: 'add-dashboard-widget',
  description: 'Add a widget to a dashboard page in the Reports section',
  inputSchema: AddWidgetInputSchema,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { dashboard_page_id: pageId, type } = args as { dashboard_page_id?: string; type?: string };
    if (!pageId) {
      throw new Error('dashboard_page_id is required');
    }
    if (!type) {
      throw new Error('type is required');
    }

    // Reason: the handler silently accepts an unknown page id, leaving an
    // orphaned widget no dashboard renders. Fail loudly instead.
    const pages = await getDashboardPages();
    if (!pages.some((page) => page.id === pageId)) {
      throw new Error(`Dashboard page not found: ${pageId}`);
    }

    await addDashboardWidget(args);

    return successWithJson(`Successfully added ${type} widget to dashboard page ${pageId}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
