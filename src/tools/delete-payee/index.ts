// ----------------------------
// DELETE PAYEE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../utils/response.js";
import { deletePayee } from "../../core/actions/modify-payee.js";

export const schema = {
  name: "delete-payee",
  description: "Delete a payee",
  inputSchema: {
    type: "string",
    description: "ID of the payee",
  },
};

export async function handler(
  id: string
): Promise<
  ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>
> {
  try {
    if (!id || typeof id !== "string") {
      throw new Error("id is required and must be a string");
    }

    await deletePayee(id);

    return successWithJson("Successfully deleted payee " + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
