// ----------------------------
// UPDATE RULE TOOL
// ----------------------------

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { updateRule } from '../../../actual-api.js';
import { UpdateRuleArgsSchema, type UpdateRuleArgs, type ToolInput } from '../../../types.js';

export const schema = {
  name: 'update-rule',
  description: 'Update a rule',
  inputSchema: zodToJsonSchema(UpdateRuleArgsSchema) as ToolInput,
};

export async function handler(args: UpdateRuleArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = UpdateRuleArgsSchema.parse(args);
    await updateRule(validatedArgs);

    return successWithJson('Successfully updated rule ' + validatedArgs.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
