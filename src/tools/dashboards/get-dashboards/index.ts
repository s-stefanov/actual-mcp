// ----------------------------
// GET DASHBOARDS TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getDashboardPages, getDashboardWidgets } from '../../../actual-api.js';

export const schema = {
  name: 'get-dashboards',
  description:
    'Retrieve every dashboard page and the widgets laid out on it. These are the dashboards under the Reports section of the sidebar.',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const [pages, widgets] = await Promise.all([getDashboardPages(), getDashboardWidgets()]);

    const dashboards = pages.map((page) => ({
      id: page.id,
      name: page.name,
      widgets: widgets.filter((widget) => widget.dashboard_page_id === page.id).sort((a, b) => a.y - b.y || a.x - b.x),
    }));

    return successWithJson(dashboards);
  } catch (err) {
    return errorFromCatch(err);
  }
}
