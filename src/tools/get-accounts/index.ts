// ----------------------------
// GET ACCOUNTS TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from "../../utils/response.js";
import { fetchAllAccounts } from "../../core/data/fetch-accounts.js";
import type { Account } from "../../core/types/domain.js";
import { getAccountBalance } from "@actual-app/api";
import { formatAmount } from "../../utils.js";

export const schema = {
  name: "get-accounts",
  description:
    "Retrieve a list of all accounts with their current balance and ID.",
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
    const accounts: Account[] = await fetchAllAccounts();

    for (const account of accounts) {
      account.balance = await getAccountBalance(account.id);
    }

    const structured = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type || "Account",
      balance: formatAmount(account.balance),
      closed: account.closed,
      offBudget: account.offbudget,
    }));

    return successWithJson(structured);
  } catch (err) {
    return errorFromCatch(err);
  }
}
