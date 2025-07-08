// ----------------------------
// DELETE PAYEE TOOL
// ----------------------------

import { deletePayee } from "../../actual-api.js";
import { successWithJson, errorFromCatch } from "../../utils/response.js";

export const schema = {
  name: "delete-payee",
  description: "Delete a payee",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "ID of the payee. Should be in UUID format.",
      },
    },
    required: ["id"],
  },
};

export async function handler(
  id: string
): Promise<
  ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>
> {
  try {
    if (!id || typeof id !== "string") {
      return errorFromCatch("id is required and must be a string");
    }

    await deletePayee(id);

    return successWithJson("Successfully deleted payee " + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
