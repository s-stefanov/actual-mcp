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
  cleared: z.boolean().optional().describe('A flag indicating if the transaction has cleared or not'),
  subtransactions: z
    .array(SubtransactionSchema)
    .optional()
    .describe(
      "An array of subtransactions for a split transaction. If amounts don't equal total amount, API call will succeed but error will show in app"
    ),
});

export type CreateTransactionArgs = z.infer<typeof CreateTransactionArgsSchema>;

// Schema for transaction data passed to the API (without account, which is passed separately)
export const TransactionDataSchema = CreateTransactionArgsSchema.omit({ account: true });
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

export const BulkUpdateTransactionsArgsSchema = z.object({
  transactions: z
    .array(UpdateTransactionArgsSchema)
    .min(1)
    .describe('Required. Array of transactions to update. Each must include an id and at least one field to update.'),
});

export type BulkUpdateTransactionsArgs = z.infer<typeof BulkUpdateTransactionsArgsSchema>;

export const GetUncategorizedTransactionsArgsSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .optional()
    .describe('Start date for filtering transactions (YYYY-MM-DD). Defaults to 3 months ago.'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .optional()
    .describe('End date for filtering transactions (YYYY-MM-DD). Defaults to today.'),
});

export type GetUncategorizedTransactionsArgs = z.infer<typeof GetUncategorizedTransactionsArgsSchema>;

export const BulkCreateRulesArgsSchema = z.object({
  rules: z
    .array(
      z.object({
        stage: z.enum(['pre', 'post']).nullable().describe('When the rule should be applied (null for default stage)'),
        conditionsOp: z.enum(['and', 'or']).describe('How to combine conditions'),
        conditions: z
          .array(
            z.object({
              field: z
                .enum(['account', 'category', 'date', 'payee', 'amount', 'imported_payee'])
                .describe('Field to apply the condition on'),
              op: z
                .enum([
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
                ])
                .describe('Condition operator'),
              value: z
                .union([z.string(), z.number(), z.array(z.string()), z.array(z.number())])
                .describe('Condition value'),
            })
          )
          .describe('Conditions for the rule to apply'),
        actions: z
          .array(
            z.object({
              field: z
                .enum(['account', 'category', 'date', 'payee', 'amount', 'cleared', 'notes'])
                .nullable()
                .describe('Field to apply the action on. Use null for split actions.'),
              op: z.enum(['set', 'prepend-notes', 'append-notes', 'set-split-amount']).describe('Action operator'),
              value: z.union([z.boolean(), z.string(), z.number(), z.null()]).describe('Action value'),
              options: z
                .object({
                  splitIndex: z.number().optional().describe('Split index (counting from 1)'),
                  method: z.enum(['fixed-amount', 'fixed-percent', 'remainder']).optional().describe('Split method'),
                })
                .optional()
                .describe('Additional properties for split rules'),
            })
          )
          .describe('Actions of the applied rule'),
      })
    )
    .min(1)
    .describe('Required. Array of rule definitions to create.'),
});

export type BulkCreateRulesArgs = z.infer<typeof BulkCreateRulesArgsSchema>;
