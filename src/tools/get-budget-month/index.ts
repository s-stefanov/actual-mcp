import { z, toJSONSchema } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { successWithJson, errorFromCatch } from '../../utils/response.js';
import { getBudgetMonth } from '../../actual-api.js';
import type { ToolInput } from '../../types.js';

const GetBudgetMonthArgsSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format with a valid month'),
});

type GetBudgetMonthArgs = z.infer<typeof GetBudgetMonthArgsSchema>;

export const schema = {
  name: 'get-budget-month',
  description: 'Retrieve budget details for one month.',
  inputSchema: toJSONSchema(GetBudgetMonthArgsSchema) as ToolInput,
};

export async function handler(args: GetBudgetMonthArgs): Promise<CallToolResult> {
  try {
    const { month } = GetBudgetMonthArgsSchema.parse(args);
    return successWithJson(await getBudgetMonth(month));
  } catch (err) {
    return errorFromCatch(err);
  }
}
