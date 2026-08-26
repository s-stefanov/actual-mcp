// ----------------------------
// ORGANIZE DASHBOARD TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getDashboardWidgets, updateDashboard } from '../../../actual-api.js';
import { OrganizeDashboardInputSchema } from '../input-schema.js';

const LAYOUT_FIELDS = ['x', 'y', 'width', 'height'] as const;

export const schema = {
  name: 'organize-dashboard',
  description:
    'Reposition and resize several dashboard widgets at once, to rearrange a dashboard layout in the Reports section',
  inputSchema: OrganizeDashboardInputSchema,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { widgets } = args as { widgets?: Array<Record<string, unknown>> };
    if (!Array.isArray(widgets) || widgets.length === 0) {
      throw new Error('widgets must be a non-empty array');
    }

    const known = new Set((await getDashboardWidgets()).map((widget) => widget.id));

    const unknownIds = widgets
      .map((widget) => widget.id)
      .filter((id): id is string => typeof id !== 'string' || !known.has(id));
    if (unknownIds.length > 0) {
      throw new Error(`Unknown widget ids: ${unknownIds.join(', ')}`);
    }

    // Reason: this handler writes columns straight to SQLite without the schema
    // conversion `dashboard-update-widget` applies, so it must be sent scalars
    // only. Passing a stored widget back would hand it a parsed `meta` object
    // and a boolean `tombstone`, which SQLite cannot bind.
    const layoutOnly = widgets.map((widget) => {
      const update: Record<string, unknown> = { id: widget.id };
      LAYOUT_FIELDS.forEach((field) => {
        if (typeof widget[field] === 'number') {
          update[field] = widget[field];
        }
      });
      return update;
    });

    await updateDashboard(layoutOnly);

    return successWithJson(`Successfully updated layout for ${layoutOnly.length} widget(s)`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
