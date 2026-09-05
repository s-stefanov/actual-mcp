// ----------------------------
// RESET BUDGET HOLD TOOL
// ----------------------------

import { z, toJSONSchema } from 'zod';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { resetBudgetHold } from '../../../actual-api.js';
import { type ToolInput } from '../../../types.js';

const ResetBudgetHoldArgsSchema = z.object({
  month: z.string().describe('Month in YYYY-MM format (e.g. "2025-01")'),
});

export const schema = {
  name: 'reset-budget-hold',
  description: 'Clear any held budget amounts for a specified month, releasing them back to the available balance.',
  inputSchema: toJSONSchema(ResetBudgetHoldArgsSchema) as ToolInput,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsed = ResetBudgetHoldArgsSchema.safeParse(args);
    if (!parsed.success) {
      return errorFromCatch(`Invalid arguments: ${parsed.error.message}`);
    }
    await resetBudgetHold(parsed.data.month);
    return successWithJson(`Successfully reset budget hold for ${parsed.data.month}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
