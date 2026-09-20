// ----------------------------
// UPDATE RULE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { updateRule } from '../../../actual-api.js';
import { RuleInputSchema } from '../input-schema.js';
import { normalizeRuleStage } from '../normalize-stage.js';

export const schema = {
  name: 'update-rule',
  description: 'Update a rule',
  inputSchema: RuleInputSchema,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.id || typeof args.id !== 'string') {
      return errorFromCatch('id is required and must be a string');
    }

    await updateRule(normalizeRuleStage(args));

    return successWithJson('Successfully updated rule ' + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
