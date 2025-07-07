// ----------------------------
// CREATE PAYEE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../utils/response.js";
import { createPayee } from "../../core/actions/modify-payee.js";
import type { Payee } from "../../types.js";

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
      category: {
        type: "string",
        description: "Category of the payee",
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

export async function handler(): Promise<
  ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>
> {
  try {
    const input = new GetTransactionsInputParser().parse(args);
    const { name, category, transferAccount } = input;

    const id: string = await createPayee({
      name,
      category: category || undefined,
      transfer_acct: transferAccount || undefined,
    });

    const structured = categories.map((payee) => ({
      id: payee.id,
      name: payee.name,
      category: payee.category || "(no category)",
      transfer_acct: payee.transfer_acct || "(not a transfer payee)",
    }));

    return successWithJson(structured);
  } catch (err) {
    return errorFromCatch(err);
  }
}
