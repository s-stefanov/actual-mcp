// ----------------------------
// DASHBOARD WIDGET SCHEMAS
// ----------------------------

/** Every widget type Actual can render on a dashboard page. */
export const WIDGET_TYPES = [
  'net-worth-card',
  'cash-flow-card',
  'spending-card',
  'budget-analysis-card',
  'custom-report',
  'crossover-card',
  'markdown-card',
  'summary-card',
  'calendar-card',
  'formula-card',
  'sankey-card',
  'age-of-money-card',
  'balance-forecast-card',
] as const;

const layoutProperties = {
  x: { type: 'number', description: 'Column position on the 12-column grid, from 0' },
  y: { type: 'number', description: 'Row position on the grid, from 0' },
  width: { type: 'number', description: 'Width in grid columns' },
  height: { type: 'number', description: 'Height in grid rows' },
};

/**
 * Widget `meta` is shaped differently per widget type, so it is accepted as a
 * free-form object and validated by Actual's own handler.
 *
 * Common keys: `name` (card title), `timeFrame` ({ start, end, mode }),
 * `conditions` / `conditionsOp` (transaction filters). Type-specific keys
 * include `content` for `markdown-card`, `id` (a saved report id) for
 * `custom-report`, `mode` for `spending-card`, and `formula` for `formula-card`.
 */
const metaProperty = {
  type: 'object',
  description:
    'Widget configuration. Shape depends on the widget type — e.g. `{ "content": "## Notes" }` for markdown-card, `{ "id": "<report-id>" }` for custom-report, `{ "name": "Spending", "mode": "budget" }` for spending-card.',
  additionalProperties: true,
};

export const AddWidgetInputSchema = {
  type: 'object',
  required: ['dashboard_page_id', 'type'],
  properties: {
    dashboard_page_id: {
      type: 'string',
      description: 'ID of the dashboard page to add the widget to. Use get-dashboards to list pages.',
    },
    type: { type: 'string', enum: WIDGET_TYPES, description: 'Which kind of widget to add' },
    meta: metaProperty,
    ...layoutProperties,
  },
  additionalProperties: false,
};

export const UpdateWidgetInputSchema = {
  type: 'object',
  required: ['id'],
  description: 'Only the fields you pass are changed; everything else keeps its current value.',
  properties: {
    id: { type: 'string', description: 'ID of the widget to update' },
    meta: metaProperty,
    ...layoutProperties,
  },
  additionalProperties: false,
};

export const OrganizeDashboardInputSchema = {
  type: 'object',
  required: ['widgets'],
  description: 'Reposition and resize several widgets in one call.',
  properties: {
    widgets: {
      type: 'array',
      description: 'Layout updates to apply. Each entry must identify an existing widget by id.',
      items: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'ID of the widget to move or resize' },
          ...layoutProperties,
        },
      },
    },
  },
  additionalProperties: false,
};
