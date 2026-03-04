// ----------------------------
// GET BUDGET MONTHS TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getBudgetMonths } from '../../../actual-api.js';

export const schema = {
  name: 'get-budget-months',
  description: 'Get a list of months that have budget data',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const months = await getBudgetMonths();
    return successWithJson(months);
  } catch (err) {
    return errorFromCatch(err);
  }
}
