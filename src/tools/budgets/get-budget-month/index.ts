// ----------------------------
// GET BUDGET MONTH TOOL
// ----------------------------

import { z, toJSONSchema } from 'zod';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getBudgetMonth } from '../../../actual-api.js';
import { type ToolInput } from '../../../types.js';

const GetBudgetMonthArgsSchema = z.object({
  month: z.string().describe('Month in YYYY-MM format (e.g. "2025-01")'),
});

export const schema = {
  name: 'get-budget-month',
  description:
    'Retrieve budget data for a specific month, including budgeted amounts, spending, and balances per category.',
  inputSchema: toJSONSchema(GetBudgetMonthArgsSchema) as ToolInput,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsed = GetBudgetMonthArgsSchema.safeParse(args);
    if (!parsed.success) {
      return errorFromCatch(`Invalid arguments: ${parsed.error.message}`);
    }
    const data = await getBudgetMonth(parsed.data.month);
    return successWithJson(data);
  } catch (err) {
    return errorFromCatch(err);
  }
}
