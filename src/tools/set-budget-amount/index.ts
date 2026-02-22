import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../utils/response.js';
import { setBudgetAmount } from '../../actual-api.js';
import { SetBudgetAmountArgsSchema, type SetBudgetAmountArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'set-budget-amount',
  description:
    'Set the budget amount for a category in a specific month. Amount is in cents (no decimals) - e.g., $500.00 = 50000.',
  inputSchema: zodToJsonSchema(SetBudgetAmountArgsSchema) as ToolInput,
};

export async function handler(args: SetBudgetAmountArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = SetBudgetAmountArgsSchema.parse(args);
    const { month, categoryId, amount } = validatedArgs;

    await setBudgetAmount(month, categoryId, amount);

    const formattedAmount = (amount / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    return success(`Successfully set budget for category ${categoryId} in ${month} to ${formattedAmount}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}
