// ----------------------------
// SET BUDGET AMOUNT TOOL
// ----------------------------

import { z, toJSONSchema } from 'zod';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { setBudgetAmount } from '../../../actual-api.js';
import { type ToolInput } from '../../../types.js';

const SetBudgetAmountArgsSchema = z.object({
  month: z.string().describe('Month in YYYY-MM format (e.g. "2025-01")'),
  categoryId: z.string().describe('ID of the category to budget'),
  value: z.number().int().describe('Budgeted amount in integer cents (e.g. 12030 = $120.30)'),
});

export const schema = {
  name: 'set-budget-amount',
  description:
    'Set the budgeted amount for a category in a given month. Value must be in integer cents (e.g. 12030 = $120.30).',
  inputSchema: toJSONSchema(SetBudgetAmountArgsSchema) as ToolInput,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsed = SetBudgetAmountArgsSchema.safeParse(args);
    if (!parsed.success) {
      return errorFromCatch(`Invalid arguments: ${parsed.error.message}`);
    }
    const { month, categoryId, value } = parsed.data;
    await setBudgetAmount(month, categoryId, value);
    return successWithJson(`Successfully set budget amount for category ${categoryId} in ${month}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
