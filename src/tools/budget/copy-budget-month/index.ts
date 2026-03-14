// ----------------------------
// COPY BUDGET MONTH TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getBudgetMonth, setBudgetAmount } from '../../../actual-api.js';

interface CategoryBudget {
  budgeted: number;
}

interface CategoryGroupBudget {
  categories: CategoryBudget[];
}

export const schema = {
  name: 'copy-budget-month',
  description:
    "Copy one month's budget to one or more target months. Reads all category budgets from the source month and applies them to each target month.",
  inputSchema: {
    type: 'object',
    properties: {
      sourceMonth: {
        type: 'string',
        description: 'Source month in YYYY-MM format (e.g. "2026-02")',
      },
      targetMonths: {
        type: 'array',
        description: 'One or more target months in YYYY-MM format',
        items: {
          type: 'string',
        },
      },
    },
    required: ['sourceMonth', 'targetMonths'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.sourceMonth || typeof args.sourceMonth !== 'string' || !/^\d{4}-\d{2}$/.test(args.sourceMonth)) {
      return errorFromCatch('sourceMonth is required and must be a string in YYYY-MM format');
    }
    if (!Array.isArray(args.targetMonths) || args.targetMonths.length === 0) {
      return errorFromCatch('targetMonths is required and must be a non-empty array');
    }
    for (const m of args.targetMonths) {
      if (typeof m !== 'string' || !/^\d{4}-\d{2}$/.test(m)) {
        return errorFromCatch(`Invalid target month: ${JSON.stringify(m)} (must be YYYY-MM format)`);
      }
    }

    const sourceMonth = args.sourceMonth;
    const targetMonths = args.targetMonths as string[];

    // Reason: getBudgetMonth returns { categoryGroups: [{ categories: [{ id, budgeted, ... }] }] }
    const budget = (await getBudgetMonth(sourceMonth)) as {
      categoryGroups?: CategoryGroupBudget[];
    };

    if (!budget.categoryGroups) {
      return errorFromCatch(`No budget data found for source month ${sourceMonth}`);
    }

    // Extract category ID → budgeted amount pairs from source
    const categoryBudgets: Array<{ id: string; budgeted: number }> = [];
    for (const group of budget.categoryGroups) {
      for (const cat of group.categories) {
        const c = cat as CategoryBudget & { id: string };
        if (c.budgeted && c.budgeted !== 0) {
          categoryBudgets.push({ id: c.id, budgeted: c.budgeted });
        }
      }
    }

    const errors: string[] = [];
    const results: Array<{ month: string; set: number }> = [];

    for (const targetMonth of targetMonths) {
      let set = 0;
      for (const { id, budgeted } of categoryBudgets) {
        try {
          // Reason: budgeted is already in cents from the API
          await setBudgetAmount(targetMonth, id, budgeted);
          set++;
        } catch (err) {
          errors.push(`Failed to set ${id} in ${targetMonth}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      results.push({ month: targetMonth, set });
    }

    return successWithJson({
      sourceMonth,
      categoriesCopied: categoryBudgets.length,
      results,
      errors,
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
