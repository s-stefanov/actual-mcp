import { z, toJSONSchema } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { successWithJson, errorFromCatch } from '../../utils/response.js';
import { setBudgetCarryover } from '../../actual-api.js';
import type { ToolInput } from '../../types.js';

const SetBudgetCarryoverArgsSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format with a valid month'),
  categoryId: z.string().min(1, 'categoryId is required'),
  carryover: z.boolean(),
});

type SetBudgetCarryoverArgs = z.infer<typeof SetBudgetCarryoverArgsSchema>;

export const schema = {
  name: 'set-budget-carryover',
  description: 'Enable or disable category budget carryover for a month.',
  inputSchema: toJSONSchema(SetBudgetCarryoverArgsSchema) as ToolInput,
};

export async function handler(args: SetBudgetCarryoverArgs): Promise<CallToolResult> {
  try {
    const { month, categoryId, carryover } = SetBudgetCarryoverArgsSchema.parse(args);
    await setBudgetCarryover(month, categoryId, carryover);
    return successWithJson({ month, categoryId, carryover });
  } catch (err) {
    return errorFromCatch(err);
  }
}
