// ----------------------------
// CREATE RULE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { createRule } from '../../../actual-api.js';
import { RuleInputSchema } from '../input-schema.js';
import { normalizeRuleStage } from '../normalize-stage.js';
import { RuleEntity } from '@actual-app/core/types/models';

export const schema = {
  name: 'create-rule',
  description: 'Create a new rule',
  inputSchema: RuleInputSchema,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { id }: RuleEntity = await createRule(normalizeRuleStage(args));

    return successWithJson('Successfully created rule ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
