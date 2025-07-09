// ----------------------------
// UPDATE PAYEE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../../utils/response.js";
import { updatePayee } from "../../../actual-api.js";

export const schema = {
  name: "update-payee",
  description: "Update a payee",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "ID of the payee. Should be in UUID format.",
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
  args: Record<string, unknown>
): Promise<
  ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>
> {
  try {
    if (!args.id || typeof args.id !== "string") {
      return errorFromCatch("id is required and must be a string");
    }

    const data: Record<string, unknown> = {};
    if (args.name) {
      data.name = args.name;
    }
    if (args.transferAccount) {
      data.transfer_acct = args.transferAccount;
    }

    await updatePayee(args.id, data);

    return successWithJson("Successfully updated payee " + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
