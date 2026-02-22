// Type definitions for Actual Budget API
export type { Account, Transaction, Category, CategoryGroup, Payee } from './core/types/domain.js';
import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

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

// ----------------------------
// RULE SCHEMAS
// ----------------------------

export const RuleConditionSchema = z.object({
  field: z
    .enum(['account', 'category', 'date', 'payee', 'amount', 'imported_payee', 'notes'])
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
    .union([
      z.string(),
      z.number(),
      z.array(z.string()),
      z.array(z.number()),
      z.object({ num1: z.number(), num2: z.number() }),
    ])
    .describe(
      'Condition value. Format depends on field and operator: account/category/payee use UUID, date uses YYYY-MM-DD, amount uses number, string[] for oneOf/notOneOf, {num1, num2} for isbetween'
    ),
  options: z
    .object({
      inflow: z.boolean().optional(),
      outflow: z.boolean().optional(),
      month: z.boolean().optional(),
      year: z.boolean().optional(),
    })
    .optional()
    .describe('Additional condition options'),
});

export type RuleCondition = z.infer<typeof RuleConditionSchema>;

export const RuleActionSchema = z.object({
  field: z
    .enum(['account', 'category', 'date', 'payee', 'amount', 'cleared', 'notes'])
    .nullable()
    .describe('Field to apply the action on. Use null for split actions'),
  op: z.enum(['set', 'prepend-notes', 'append-notes', 'set-split-amount']).describe('Action operator'),
  value: z
    .union([z.boolean(), z.string(), z.number(), z.null()])
    .describe(
      'Action value. For regular actions: account/category/payee use UUID, date uses YYYY-MM-DD, amount uses number (cents), cleared uses boolean, notes uses string. For split actions: null for remainder, number for fixed-amount/fixed-percent'
    ),
  options: z
    .object({
      splitIndex: z.number().optional().describe('Split index (1-based) to apply action on. 0 for all splits'),
      method: z
        .enum(['fixed-amount', 'fixed-percent', 'remainder'])
        .optional()
        .describe('Split method. Only for split actions'),
      template: z.string().optional(),
      formula: z.string().optional(),
    })
    .optional()
    .describe('Additional options for splits'),
});

export type RuleAction = z.infer<typeof RuleActionSchema>;

export const NewRuleArgsSchema = z.object({
  stage: z.enum(['pre', 'post']).nullable().describe('When the rule should be applied (null for default stage)'),
  conditionsOp: z.enum(['and', 'or']).describe('How to combine conditions'),
  conditions: z.array(RuleConditionSchema).describe('Conditions for the rule to apply'),
  actions: z.array(RuleActionSchema).describe('Actions of the applied rule'),
});

export type NewRuleArgs = z.infer<typeof NewRuleArgsSchema>;

export const UpdateRuleArgsSchema = NewRuleArgsSchema.extend({
  id: z.string().describe('Rule ID in UUID format (required for updating a rule)'),
});

export type UpdateRuleArgs = z.infer<typeof UpdateRuleArgsSchema>;

// ----------------------------
// BUDGET SCHEMAS
// ----------------------------

export const SetBudgetAmountArgsSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format')
    .describe('The budget month in YYYY-MM format (e.g., 2026-02)'),
  categoryId: z.string().describe('The ID of the category to set the budget for'),
  amount: z
    .number()
    .describe(
      'Budget amount as an integer representing the value without decimal places. For example, $500.00 = 50000'
    ),
});

export type SetBudgetAmountArgs = z.infer<typeof SetBudgetAmountArgsSchema>;
