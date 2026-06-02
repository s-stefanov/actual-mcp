// ----------------------------
// GET BUDGET MONTHS TOOL
// ----------------------------

import { z, toJSONSchema } from 'zod';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getBudgetMonths } from '../../../actual-api.js';
import { type ToolInput } from '../../../types.js';

const GetBudgetMonthsArgsSchema = z.object({});

export const schema = {
  name: 'get-budget-months',
  description: 'Retrieve a list of all available budget months in YYYY-MM format.',
  inputSchema: toJSONSchema(GetBudgetMonthsArgsSchema) as ToolInput,
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const months = await getBudgetMonths();
    return successWithJson(months);
  } catch (err) {
    return errorFromCatch(err);
  }
}
