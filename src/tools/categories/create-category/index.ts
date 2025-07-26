// ----------------------------
// CREATE CATEGORY TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../../utils/response.js";
import { createCategory } from "../../../actual-api.js";

export const schema = {
  name: "create-category",
  description: "Create a new category",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the category",
      },
      groupId: {
        type: "string",
        description: "ID of the category group. Should be in UUID format.",
      },
    },
    required: ["name", "groupId"],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<
  ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>
> {
  try {
    if (!args.name || typeof args.name !== "string") {
      return errorFromCatch("name is required and must be a string");
    }

    const data: Record<string, unknown> = {
      name: args.name,
      group_id: args.groupId,
    };

    const id: string = await createCategory(data);

    return successWithJson("Successfully created category " + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
