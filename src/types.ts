// Type definitions for Actual Budget API
export type { Account, Transaction, Category, CategoryGroup, Payee } from './core/types/domain.js';
import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export type ToolInput = Tool['inputSchema'];

export interface BudgetFile {
  id?: string;
  cloudFileId?: string;
  name: string;
}

// Type definitions for tool arguments
export const GetTransactionsArgsSchema = z.object({
  accountId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  categoryName: z.string().optional(),
  payeeName: z.string().optional(),
  limit: z.number().optional(),
});

export type GetTransactionsArgs = z.infer<typeof GetTransactionsArgsSchema>;

export const SpendingByCategoryArgsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountId: z.string().optional(),
  includeIncome: z.boolean().optional(),
});

export type SpendingByCategoryArgs = z.infer<typeof SpendingByCategoryArgsSchema>;

export const MonthlySummaryArgsSchema = z.object({
  months: z.number().optional().default(3),
  accountId: z.string().optional(),
});

export type MonthlySummaryArgs = z.infer<typeof MonthlySummaryArgsSchema>;

export const BalanceHistoryArgsSchema = z.object({
  accountId: z.string(),
  includeOffBudget: z.boolean().optional().default(false),
  months: z.number().optional().default(3),
});

export type BalanceHistoryArgs = z.infer<typeof BalanceHistoryArgsSchema>;

export const FinancialInsightsArgsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type FinancialInsightsArgs = z.infer<typeof FinancialInsightsArgsSchema>;

export const BudgetReviewArgsSchema = z.object({
  months: z.number().optional().default(3),
});

export type BudgetReviewArgs = z.infer<typeof BudgetReviewArgsSchema>;

export const UpdateSubtransactionSchema = z.object({
  id: z
    .string()
    .optional()
    .describe('The ID of an existing subtransaction to update. Omit to add a new subtransaction.'),
  amount: z.number().describe('Required for subtransactions. A currency amount as an integer'),
  category: z.string().optional().describe('The ID of the category for this subtransaction'),
  notes: z.string().optional().describe('Any additional notes for this subtransaction'),
  payee: z
    .string()
    .optional()
    .describe('An existing payee ID for this subtransaction. Overridden by transfer_account_id if both are given.'),
  transfer_account_id: z
    .string()
    .optional()
    .describe(
      'The ID of the destination account for a transfer originating from this subtransaction (split leg). ' +
        'When provided, the transfer payee is automatically resolved and the counterpart transaction is created ' +
        'in the destination account. The amount should be negative (money leaving the source account).'
    ),
});

export type UpdateSubtransaction = z.infer<typeof UpdateSubtransactionSchema>;

export const UpdateTransactionArgsSchema = z.object({
  id: z.string().describe('Required. The ID of the transaction to update'),
  account: z.string().optional().describe('The ID of the account to move this transaction to'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .optional()
    .describe('Transaction date in YYYY-MM-DD format'),
  amount: z
    .number()
    .optional()
    .describe(
      'A currency amount as an integer representing the value without decimal places. For example, USD amount of $120.30 would be 12030'
    ),
  payee: z.string().optional().describe('An existing payee ID'),
  imported_payee: z
    .string()
    .optional()
    .describe(
      'This can be anything. Meant to represent the raw description when importing, allowing the user to see the original value'
    ),
  category: z.string().optional().describe('The ID of the category to assign to this transaction'),
  notes: z.string().optional().describe('Any additional notes for the transaction'),
  imported_id: z
    .string()
    .optional()
    .describe('A unique id usually given by the bank, if importing. Use this to avoid duplicate transactions'),
  cleared: z.boolean().optional().describe('A flag indicating if the transaction has cleared or not'),
  subtransactions: z
    .array(UpdateSubtransactionSchema)
    .optional()
    .describe(
      "An array of subtransactions for a split transaction. Replaces existing subtransactions. If amounts don't equal total amount, API call will succeed but error will show in app"
    ),
});

export type UpdateTransactionArgs = z.infer<typeof UpdateTransactionArgsSchema>;

// Schema for update data passed to the API (without id, which is passed separately)
export const UpdateTransactionDataSchema = UpdateTransactionArgsSchema.omit({ id: true });
export type UpdateTransactionData = z.infer<typeof UpdateTransactionDataSchema>;

export const SubtransactionSchema = z.object({
  amount: z.number().describe('Required for subtransactions. A currency amount as an integer'),
  category: z.string().optional().describe('The ID of the category for this subtransaction'),
  notes: z.string().optional().describe('Any additional notes for this subtransaction'),
  payee: z
    .string()
    .optional()
    .describe('An existing payee ID for this subtransaction. Overridden by transfer_account_id if both are given.'),
  transfer_account_id: z
    .string()
    .optional()
    .describe(
      'The ID of the destination account for a transfer originating from this subtransaction (split leg). ' +
        'When provided, the transfer payee is automatically resolved and the counterpart transaction is created ' +
        'in the destination account. The amount should be negative (money leaving the source account).'
    ),
});

export type Subtransaction = z.infer<typeof SubtransactionSchema>;

export const CreateTransactionArgsSchema = z.object({
  account: z.string().describe('Required. The ID of the account this transaction belongs to'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .describe('Required. Transaction date in YYYY-MM-DD format'),
  amount: z
    .number()
    .describe(
      'Required. A currency amount as an integer representing the value without decimal places. For example, USD amount of $120.30 would be 12030'
    ),
  payee: z.string().optional().describe('An existing payee ID. This overrides payee_name if both are provided.'),
  payee_name: z
    .string()
    .optional()
    .describe(
      'If given, a payee will be created with this name. If this matches an already existing payee, that payee will be used.'
    ),
  imported_payee: z
    .string()
    .optional()
    .describe(
      'This can be anything. Meant to represent the raw description when importing, allowing the user to see the original value'
    ),
  category: z.string().optional().describe('Recommended. The ID of the category to assign to this transaction'),
  notes: z.string().optional().describe('Any additional notes for the transaction'),
  imported_id: z
    .string()
    .optional()
    .describe('A unique id usually given by the bank, if importing. Use this to avoid duplicate transactions'),
  transfer_id: z
    .string()
    .optional()
    .describe(
      'If a transfer, the id of the corresponding transaction in the other account. Only set this when importing'
    ),
  transfer_account_id: z
    .string()
    .optional()
    .describe(
      'The ID of the destination account for a transfer. When provided, the transfer payee is automatically resolved and the counterpart transaction is created in the destination account. The amount should be negative (money leaving the source account).'
    ),
  cleared: z.boolean().optional().describe('A flag indicating if the transaction has cleared or not'),
  subtransactions: z
    .array(SubtransactionSchema)
    .optional()
    .describe(
      "An array of subtransactions for a split transaction. If amounts don't equal total amount, API call will succeed but error will show in app"
    ),
});

export type CreateTransactionArgs = z.infer<typeof CreateTransactionArgsSchema>;

// Schema for transaction data passed to the API (without account and transfer_account_id, which are handled separately)
export const TransactionDataSchema = CreateTransactionArgsSchema.omit({ account: true, transfer_account_id: true });
export type TransactionData = z.infer<typeof TransactionDataSchema>;

// Subtransaction schema for imports — amount is a decimal (e.g. 3.24), converted to integer by the API wrapper
export const ImportSubtransactionSchema = z.object({
  amount: z
    .number()
    .describe(
      'Required. Amount as a decimal number (e.g. 3.24 for $3.24). Negative for expenses, positive for income.'
    ),
  category: z.string().optional().describe('The ID of the category for this subtransaction'),
  notes: z.string().optional().describe('Any additional notes for this subtransaction'),
  payee: z
    .string()
    .optional()
    .describe('An existing payee ID for this subtransaction. Overridden by transfer_account_id if both are given.'),
  transfer_account_id: z
    .string()
    .optional()
    .describe(
      'The ID of the destination account for a transfer originating from this subtransaction (split leg). ' +
        'When provided, the transfer payee is automatically resolved and the counterpart transaction is created ' +
        'in the destination account. The amount should be negative (money leaving the source account).'
    ),
});

// Schema for a single transaction item in a bulk import.
// Accepts decimal amounts (e.g. 3.24) which are converted to integers by the API wrapper.
export const ImportTransactionItemSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .describe('Required. Transaction date in YYYY-MM-DD format'),
  amount: z
    .number()
    .describe(
      'Required. Amount as a decimal number (e.g. 3.24 for $3.24). Negative for expenses, positive for income.'
    ),
  payee: z.string().optional().describe('An existing payee ID. This overrides payee_name if both are provided.'),
  payee_name: z
    .string()
    .optional()
    .describe(
      'If given, a payee will be created with this name. If this matches an already existing payee, that payee will be used.'
    ),
  imported_payee: z
    .string()
    .optional()
    .describe(
      'This can be anything. Meant to represent the raw description when importing, allowing the user to see the original value'
    ),
  category: z.string().optional().describe('Recommended. The ID of the category to assign to this transaction'),
  notes: z.string().optional().describe('Any additional notes for the transaction'),
  imported_id: z
    .string()
    .optional()
    .describe('A unique id usually given by the bank, if importing. Use this to avoid duplicate transactions'),
  transfer_id: z
    .string()
    .optional()
    .describe(
      'If a transfer, the id of the corresponding transaction in the other account. Only set this when importing'
    ),
  cleared: z.boolean().optional().describe('A flag indicating if the transaction has cleared or not'),
  subtransactions: z
    .array(ImportSubtransactionSchema)
    .optional()
    .describe(
      "An array of subtransactions for a split transaction. If amounts don't equal total amount, API call will succeed but error will show in app"
    ),
});

export type ImportTransactionItem = z.infer<typeof ImportTransactionItemSchema>;

export const ImportTransactionsArgsSchema = z.object({
  accountId: z.string().describe('Required. The ID of the account to import transactions into'),
  transactions: z
    .array(ImportTransactionItemSchema)
    .min(1)
    .describe('Required. List of transactions to import. Use imported_id to avoid duplicate imports on repeated runs.'),
  defaultCleared: z
    .boolean()
    .optional()
    .describe('Default cleared state for all imported transactions (can be overridden per transaction)'),
  dryRun: z.boolean().optional().describe('If true, validate and preview the import without persisting any changes'),
});

export type ImportTransactionsArgs = z.infer<typeof ImportTransactionsArgsSchema>;

// Additional types used in implementation
export interface CategoryGroupInfo {
  id: string;
  name: string;
  isIncome: boolean;
  isSavingsOrInvestment: boolean;
}

export interface CategorySpending {
  name: string;
  group: string;
  isIncome: boolean;
  total: number;
  transactions: number;
}

export interface GroupSpending {
  name: string;
  total: number;
  categories: CategorySpending[];
}

export interface MonthData {
  year: number;
  month: number;
  income: number;
  expenses: number;
  investments: number;
  transactions: number;
}

export interface MonthBalance {
  year: number;
  month: number;
  balance: number;
  transactions: number;
}

export const BudgetVsActualArgsSchema = z.object({
  months: z.number().optional().default(3).describe('Number of most recent months to report on'),
  categoryGroupName: z.string().optional().describe('Restrict the report to a single category group, by name'),
  includeHidden: z.boolean().optional().default(false).describe('Include categories and groups marked hidden'),
});

export type BudgetVsActualArgs = z.infer<typeof BudgetVsActualArgsSchema>;

export const NetWorthArgsSchema = z.object({
  months: z.number().optional().default(12).describe('Number of most recent months to report on'),
  includeOffBudget: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include off-budget accounts. Defaults to true, since net worth normally covers every account.'),
  includeClosed: z.boolean().optional().default(false).describe('Include closed accounts'),
});

export type NetWorthArgs = z.infer<typeof NetWorthArgsSchema>;

export const CategoryTrendsArgsSchema = z.object({
  months: z.number().optional().default(6).describe('Number of most recent months to report on'),
  categoryNames: z.array(z.string()).optional().describe('Restrict the report to these categories, by name'),
  categoryGroupName: z.string().optional().describe('Restrict the report to a single category group, by name'),
  includeIncome: z.boolean().optional().default(false).describe('Include income categories'),
});

export type CategoryTrendsArgs = z.infer<typeof CategoryTrendsArgsSchema>;

export const SpendingByPayeeArgsSchema = z.object({
  startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
  accountId: z.string().optional().describe('Restrict the report to a single account'),
  limit: z.number().optional().default(20).describe('Maximum number of payees to list'),
  includeIncome: z.boolean().optional().default(false).describe('Report income received instead of money spent'),
});

export type SpendingByPayeeArgs = z.infer<typeof SpendingByPayeeArgsSchema>;

export const CashFlowArgsSchema = z.object({
  months: z.number().optional().default(6).describe('Number of most recent months to report on'),
  accountId: z.string().optional().describe('Restrict the report to a single account'),
  interval: z
    .enum(['monthly', 'weekly'])
    .optional()
    .default('monthly')
    .describe('Bucket size for each row of the report'),
});

export type CashFlowArgs = z.infer<typeof CashFlowArgsSchema>;

export interface BudgetMonthCategory {
  id: string;
  name: string;
  group_id?: string;
  is_income?: boolean;
  hidden?: boolean;
  budgeted?: number;
  spent?: number;
  balance?: number;
  carryover?: boolean;
}

export interface BudgetMonthGroup {
  id: string;
  name: string;
  is_income?: boolean;
  hidden?: boolean;
  budgeted?: number;
  spent?: number;
  balance?: number;
  categories?: BudgetMonthCategory[];
}

export interface BudgetMonth {
  month: string;
  incomeAvailable: number;
  lastMonthOverspent: number;
  forNextMonth: number;
  totalBudgeted: number;
  toBudget: number;
  fromLastMonth: number;
  totalIncome: number;
  totalSpent: number;
  totalBalance: number;
  categoryGroups: BudgetMonthGroup[];
}
