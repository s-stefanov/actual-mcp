// ----------------------------
// GET RULES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../../utils/response.js";
import type { Rule } from "../../../types.js";
import { fetchAllRules } from "../../../core/data/fetch-rules.js";

export const schema = {
  name: "get-rules",
  description: "Retrieve a list of all rules.",
  inputSchema: {
    type: "object",
    description: "This tool does not accept any arguments.",
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(
  args: unknown
): Promise<
  ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>
> {
  try {
    const rules: Rule[] = await fetchAllRules();

    return successWithJson(rules);
  } catch (err) {
    return errorFromCatch(err);
  }
}
