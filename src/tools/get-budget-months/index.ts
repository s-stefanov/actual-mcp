import { successWithJson, errorFromCatch } from '../../utils/response.js';
import { getBudgetMonths } from '../../actual-api.js';

export const schema = {
  name: 'get-budget-months',
  description: 'Retrieve the months available in the budget.',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    return successWithJson(await getBudgetMonths());
  } catch (err) {
    return errorFromCatch(err);
  }
}
