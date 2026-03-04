// ----------------------------
// SET BUDGET AMOUNT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { setBudgetAmount } from '../../../actual-api.js';

export const schema = {
  name: 'set-budget-amount',
  description: 'Set the budgeted amount for a category in a specific month',
  inputSchema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Month in YYYY-MM format (e.g. "2026-03")',
      },
      categoryId: {
        type: 'string',
        description: 'UUID of the category',
      },
      amount: {
        type: 'number',
        description: 'Dollar amount to budget (e.g. 150.50)',
      },
    },
    required: ['month', 'categoryId', 'amount'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.month || typeof args.month !== 'string' || !/^\d{4}-\d{2}$/.test(args.month)) {
      return errorFromCatch('month is required and must be a string in YYYY-MM format');
    }
    if (!args.categoryId || typeof args.categoryId !== 'string') {
      return errorFromCatch('categoryId is required and must be a string');
    }
    if (typeof args.amount !== 'number') {
      return errorFromCatch('amount is required and must be a number');
    }

    // Reason: Actual stores amounts as integer cents
    const amountInCents = Math.round(args.amount * 100);

    await setBudgetAmount(args.month, args.categoryId, amountInCents);

    return successWithJson(`Set budget for category ${args.categoryId} in ${args.month} to $${args.amount}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
