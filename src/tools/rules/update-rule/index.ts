// ----------------------------
// UPDATE RULE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../../utils/response.js";
import { createRule, updateRule } from "../../../actual-api.js";
import { RuleInputSchema } from "../input-schema.js";
import { Rule } from "../../../types.js";

export const schema = {
  name: "update-rule",
  description: "Update a rule",
  inputSchema: RuleInputSchema,
};

export async function handler(
  args: Record<string, unknown>
): Promise<
  ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>
> {
  try {
    if (!args.id || typeof args.id !== "string") {
      return errorFromCatch("id is required and must be a string");
    }

    await updateRule(args);

    return successWithJson("Successfully updated rule " + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
