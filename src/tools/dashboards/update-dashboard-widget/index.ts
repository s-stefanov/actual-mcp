// ----------------------------
// UPDATE DASHBOARD WIDGET TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getDashboardWidgets, updateDashboardWidget } from '../../../actual-api.js';
import { UpdateWidgetInputSchema } from '../input-schema.js';

export const schema = {
  name: 'update-dashboard-widget',
  description: "Update a dashboard widget's configuration, position, or size",
  inputSchema: UpdateWidgetInputSchema,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { id } = args as { id?: string };
    if (!id) {
      throw new Error('id is required');
    }

    const existing = (await getDashboardWidgets()).find((widget) => widget.id === id);
    if (!existing) {
      throw new Error(`Widget not found: ${id}`);
    }

    await updateDashboardWidget({ ...args, id });

    return successWithJson('Successfully updated widget ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
