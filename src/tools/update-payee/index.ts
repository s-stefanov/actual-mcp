// ----------------------------
// UPDATE PAYEE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../utils/response.js";
import type { Payee } from "../../types.js";
import { updatePayee } from "../../actual-api.js";

export const schema = {
  name: "update-payee",
  description: "Update a payee",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "id",
        description: "ID of the payee",
      },
      name: {
        type: "string",
        description: "New name for the payee",
      },
      transferAccount: {
        type: "string",
        description: "New ID for the transfer account",
      },
    },
    required: ["id"],
  },
};

export async function handler(
  args: Payee
): Promise<
  ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>
> {
  try {
    if (!args.id || typeof args.id !== "string") {
      return errorFromCatch("id is required and must be a string");
    }

    const updateData: Record<string, unknown> = {};
    if (args.name) {
      updateData.name = args.name;
    }
    if (args.transfer_acct) {
      updateData.transfer_acct = args.transfer_acct;
    }
    await updatePayee(args.id, updateData);

    return successWithJson("Successfully updated payee " + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
