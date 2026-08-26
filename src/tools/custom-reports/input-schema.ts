// ----------------------------
// SAVED CUSTOM REPORT SCHEMAS
// ----------------------------

const conditionsSchema = {
  type: 'array',
  description: 'Filters limiting which transactions the report covers',
  items: {
    type: 'object',
    required: ['field', 'op', 'value'],
    properties: {
      field: {
        type: 'string',
        enum: ['account', 'category', 'date', 'payee', 'amount', 'notes', 'imported_payee', 'transfer'],
        description: 'Field to filter on',
      },
      op: {
        type: 'string',
        enum: [
          'is',
          'isNot',
          'oneOf',
          'notOneOf',
          'onBudget',
          'offBudget',
          'isapprox',
          'gt',
          'gte',
          'lt',
          'lte',
          'isbetween',
          'contains',
          'doesNotContain',
          'matches',
          'hasTags',
        ],
        description: 'Filter operator',
      },
      value: {
        description: 'Filter value. IDs for account/category/payee, YYYY-MM-DD for date, cents for amount.',
      },
      type: { type: 'string', description: 'Value type hint, e.g. `id`' },
    },
  },
};

const reportProperties = {
  name: { type: 'string', description: 'Report name. Must be unique across saved reports.' },
  startDate: { type: 'string', description: 'Start of the reporting period, in YYYY-MM-DD format' },
  endDate: { type: 'string', description: 'End of the reporting period, in YYYY-MM-DD format' },
  isDateStatic: {
    type: 'boolean',
    description: 'True to pin the report to startDate/endDate, false to follow the rolling dateRange',
  },
  dateRange: { type: 'string', description: 'Rolling range label, e.g. `Last 6 months`' },
  mode: { type: 'string', enum: ['total', 'time'], description: 'Totals for the period, or a value per interval' },
  groupBy: {
    type: 'string',
    enum: ['Category', 'Group', 'Payee', 'Account', 'Interval'],
    description: 'How report rows are grouped',
  },
  interval: {
    type: 'string',
    enum: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
    description: 'Bucket size when mode is `time`',
  },
  balanceType: {
    type: 'string',
    enum: ['Payment', 'Deposit', 'Net'],
    description: 'Which side of the ledger the report totals',
  },
  sortBy: { type: 'string', enum: ['asc', 'desc', 'name', 'budget'], description: 'Row sort order' },
  graphType: {
    type: 'string',
    enum: ['BarGraph', 'StackedBarGraph', 'LineGraph', 'AreaGraph', 'DonutGraph', 'TableGraph'],
    description: 'How the report is drawn',
  },
  showEmpty: { type: 'boolean', description: 'Include rows with no activity' },
  showOffBudget: { type: 'boolean', description: 'Include off-budget accounts' },
  showHiddenCategories: { type: 'boolean', description: 'Include hidden categories' },
  showUncategorized: { type: 'boolean', description: 'Include uncategorized transactions' },
  includeCurrentInterval: { type: 'boolean', description: 'Include the in-progress interval' },
  trimIntervals: { type: 'boolean', description: 'Drop leading and trailing empty intervals' },
  showTrendLines: { type: 'boolean', description: 'Draw trend lines on the graph' },
  conditionsOp: { type: 'string', enum: ['and', 'or'], description: 'How conditions combine' },
  conditions: conditionsSchema,
};

export const CreateReportInputSchema = {
  type: 'object',
  required: ['name', 'conditionsOp'],
  properties: reportProperties,
  additionalProperties: false,
};

export const UpdateReportInputSchema = {
  type: 'object',
  required: ['id'],
  description: 'Only the fields you pass are changed; everything else keeps its current value.',
  properties: {
    id: { type: 'string', description: 'ID of the report to update' },
    ...reportProperties,
  },
  additionalProperties: false,
};
