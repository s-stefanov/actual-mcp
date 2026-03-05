// ----------------------------
// SET BUDGET MONTH TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { setBudgetAmount } from '../../../actual-api.js';

interface BudgetEntry {
  categoryId: string;
  amount: number;
}

export const schema = {
  name: 'set-budget-month',
  description:
    'Set budgeted amounts for multiple categories in a single month. Accepts an array of {categoryId, amount} pairs and applies them all at once.',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Month in YYYY-MM format (e.g. "2026-03")',
      },
      budgets: {
        type: 'array',
        description: 'Array of budget entries to set',
        items: {
          type: 'object',
          properties: {
            categoryId: {
              type: 'string',
              description: 'UUID of the category',
            },
            amount: {
              type: 'number',
              description: 'Dollar amount to budget (e.g. 150.50)',
            },
          },
          required: ['categoryId', 'amount'],
        },
      },
    },
    required: ['month', 'budgets'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.month || typeof args.month !== 'string' || !/^\d{4}-\d{2}$/.test(args.month)) {
      return errorFromCatch('month is required and must be a string in YYYY-MM format');
    }
    if (!Array.isArray(args.budgets) || args.budgets.length === 0) {
      return errorFromCatch('budgets is required and must be a non-empty array');
    }

    const month = args.month;
    const budgets = args.budgets as BudgetEntry[];
    const errors: string[] = [];
    let set = 0;

    for (const entry of budgets) {
      try {
        if (!entry.categoryId || typeof entry.categoryId !== 'string') {
          errors.push(`Invalid categoryId: ${JSON.stringify(entry.categoryId)}`);
          continue;
        }
        if (typeof entry.amount !== 'number') {
          errors.push(`Invalid amount for ${entry.categoryId}: ${JSON.stringify(entry.amount)}`);
          continue;
        }
        // Reason: Actual stores amounts as integer cents
        const amountInCents = Math.round(entry.amount * 100);
        await setBudgetAmount(month, entry.categoryId, amountInCents);
        set++;
      } catch (err) {
        errors.push(`Failed to set ${entry.categoryId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return successWithJson({ month, set, errors });
  } catch (err) {
    return errorFromCatch(err);
  }
}
