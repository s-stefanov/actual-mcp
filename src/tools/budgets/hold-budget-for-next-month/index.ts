// ----------------------------
// HOLD BUDGET FOR NEXT MONTH TOOL
// ----------------------------

import { z, toJSONSchema } from 'zod';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { holdBudgetForNextMonth } from '../../../actual-api.js';
import { type ToolInput } from '../../../types.js';

const HoldBudgetForNextMonthArgsSchema = z.object({
  month: z.string().describe('Month in YYYY-MM format (e.g. "2025-01")'),
  value: z.number().int().describe('Amount in integer cents to hold for the next month (e.g. 5000 = $50.00)'),
});

export const schema = {
  name: 'hold-budget-for-next-month',
  description:
    'Reserve budget funds from the current month to be used in the following month. Value must be in integer cents.',
  inputSchema: toJSONSchema(HoldBudgetForNextMonthArgsSchema) as ToolInput,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsed = HoldBudgetForNextMonthArgsSchema.safeParse(args);
    if (!parsed.success) {
      return errorFromCatch(`Invalid arguments: ${parsed.error.message}`);
    }
    const { month, value } = parsed.data;
    await holdBudgetForNextMonth(month, value);
    return successWithJson(`Successfully held ${value} cents for next month from ${month}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
