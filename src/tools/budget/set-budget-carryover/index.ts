// ----------------------------
// SET BUDGET CARRYOVER TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { setBudgetCarryover } from '../../../actual-api.js';

export const schema = {
  name: 'set-budget-carryover',
  description: 'Set the carryover flag for a category in a specific month',
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
      carryover: {
        type: 'boolean',
        description: 'Whether to carry over leftover budget to the next month',
      },
    },
    required: ['month', 'categoryId', 'carryover'],
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
    if (typeof args.carryover !== 'boolean') {
      return errorFromCatch('carryover is required and must be a boolean');
    }

    await setBudgetCarryover(args.month, args.categoryId, args.carryover);

    return successWithJson(`Set carryover for category ${args.categoryId} in ${args.month} to ${args.carryover}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
