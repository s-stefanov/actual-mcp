// ----------------------------
// SET BUDGET CARRYOVER TOOL
// ----------------------------

import { z, toJSONSchema } from 'zod';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { setBudgetCarryover } from '../../../actual-api.js';
import { type ToolInput } from '../../../types.js';

const SetBudgetCarryoverArgsSchema = z.object({
  month: z.string().describe('Month in YYYY-MM format (e.g. "2025-01")'),
  categoryId: z.string().describe('ID of the category'),
  flag: z.boolean().describe('true to enable carryover of unspent funds, false to disable'),
});

export const schema = {
  name: 'set-budget-carryover',
  description: 'Enable or disable carryover of unspent funds for a category into the next month.',
  inputSchema: toJSONSchema(SetBudgetCarryoverArgsSchema) as ToolInput,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsed = SetBudgetCarryoverArgsSchema.safeParse(args);
    if (!parsed.success) {
      return errorFromCatch(`Invalid arguments: ${parsed.error.message}`);
    }
    const { month, categoryId, flag } = parsed.data;
    await setBudgetCarryover(month, categoryId, flag);
    return successWithJson(
      `Successfully ${flag ? 'enabled' : 'disabled'} carryover for category ${categoryId} in ${month}`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
