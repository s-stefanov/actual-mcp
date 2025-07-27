// ----------------------------
// DELETE RULE TOOL
// ----------------------------

import { deleteRule } from "../../../actual-api.js";
import { successWithJson, errorFromCatch } from "../../../utils/response.js";

export const schema = {
  name: "delete-rule",
  description: "Delete a rule",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "ID of the rule. Should be in UUID format.",
      },
    },
    required: ["id"],
  },
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

    await deleteRule(args.id);

    return successWithJson("Successfully deleted rule " + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
