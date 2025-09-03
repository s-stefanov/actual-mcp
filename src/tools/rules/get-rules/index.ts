// ----------------------------
// GET RULES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
// import type { Rule } from '../../../types.js';
import { fetchAllRules } from '../../../core/data/fetch-rules.js';
import { RuleEntity } from '@actual-app/api/@types/loot-core/src/types/models/rule.js';

export const schema = {
  name: 'get-rules',
  description: 'Retrieve a list of all rules. PS amount comes in cents: positive for deposit, negative for payment',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const rules: RuleEntity[] = await fetchAllRules();

    return successWithJson(rules);
  } catch (err) {
    return errorFromCatch(err);
  }
}
