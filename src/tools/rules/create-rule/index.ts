// ----------------------------
// CREATE RULE TOOL
// ----------------------------

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { createRule } from '../../../actual-api.js';
import { NewRuleArgsSchema, type NewRuleArgs, type ToolInput } from '../../../types.js';

export const schema = {
  name: 'create-rule',
  description: 'Create a new rule',
  inputSchema: zodToJsonSchema(NewRuleArgsSchema) as ToolInput,
};

export async function handler(args: NewRuleArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = NewRuleArgsSchema.parse(args);
    const { id } = await createRule(validatedArgs);

    return successWithJson('Successfully created rule ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
