// ----------------------------
// UPDATE PAYEE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../utils/response.js";
import { updatePayee } from "../../core/actions/modify-payee.js";
import type { Payee } from "../../types.js";

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
      throw new Error("id is required and must be a string");
    }

    await updatePayee(args.id, {
      name: args.name || undefined,
      transfer_acct: args.transfer_acct || undefined,
    });

    return successWithJson("Successfully updated payee " + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
