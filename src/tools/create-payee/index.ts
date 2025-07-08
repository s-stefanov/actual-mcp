// ----------------------------
// CREATE PAYEE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../utils/response.js";
import type { Payee } from "../../types.js";
import { createPayee } from "../../actual-api.js";

export const schema = {
  name: "create-payee",
  description: "Create a new payee",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the payee",
      },
      transferAccount: {
        type: "string",
        description:
          "ID of the transfer account. Should be in UUID format. Only for transfer payees.",
      },
    },
    required: ["name"],
  },
};

export async function handler(
  args: Payee
): Promise<
  ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>
> {
  try {
    const id: string = await createPayee({
      name: args.name,
      transfer_acct: args.transfer_acct || undefined,
    });

    return successWithJson(id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
