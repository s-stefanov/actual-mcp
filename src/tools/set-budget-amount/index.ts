import { z, toJSONSchema } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { successWithJson, errorFromCatch } from '../../utils/response.js';
import { setBudgetAmount } from '../../actual-api.js';
import type { ToolInput } from '../../types.js';

const SetBudgetAmountArgsSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format with a valid month'),
  categoryId: z.string().min(1, 'categoryId is required'),
  amount: z.number().int('amount must be an integer in minor units'),
});

type SetBudgetAmountArgs = z.infer<typeof SetBudgetAmountArgsSchema>;

export const schema = {
  name: 'set-budget-amount',
  description: 'Set a category budget amount for a month, in integer minor units.',
  inputSchema: toJSONSchema(SetBudgetAmountArgsSchema) as ToolInput,
};

export async function handler(args: SetBudgetAmountArgs): Promise<CallToolResult> {
  try {
    const { month, categoryId, amount } = SetBudgetAmountArgsSchema.parse(args);
    await setBudgetAmount(month, categoryId, amount);
    return successWithJson({ month, categoryId, amount });
  } catch (err) {
    return errorFromCatch(err);
  }
}
