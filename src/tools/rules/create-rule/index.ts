// ----------------------------
// CREATE RULE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../../utils/response.js";
import { createRule } from "../../../actual-api.js";
import { RuleInputSchema } from "../input-schema.js";
import { Rule } from "../../../types.js";

export const schema = {
  name: "create-rule",
  description: "Create a new rule",
  inputSchema: RuleInputSchema,
};

export async function handler(
  args: Record<string, unknown>
): Promise<
  ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>
> {
  try {
    const { id }: Rule = await createRule(args);

    return successWithJson(id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
