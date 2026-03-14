// ----------------------------
// GET PAYEE RULES TOOL
// ----------------------------

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z, toJSONSchema } from 'zod';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { fetchPayeeRules } from '../../../core/data/fetch-payee-rules.js';
import { ToolInput } from '../../../types.js';

const GetPayeeRulesArgsSchema = z.object({
  payeeId: z.string().describe('Required. The ID of the payee to retrieve rules for'),
});

type GetPayeeRulesArgs = z.infer<typeof GetPayeeRulesArgsSchema>;

export const schema = {
  name: 'get-payee-rules',
  description: 'Retrieve rules associated with a specific payee',
  inputSchema: toJSONSchema(GetPayeeRulesArgsSchema) as ToolInput,
};

export async function handler(args: GetPayeeRulesArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = GetPayeeRulesArgsSchema.parse(args);
    const rules = await fetchPayeeRules(validatedArgs.payeeId);

    return successWithJson(rules);
  } catch (err) {
    return errorFromCatch(err);
  }
}
