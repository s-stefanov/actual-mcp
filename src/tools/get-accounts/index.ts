// ----------------------------
// GET ACCOUNTS TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../utils/response.js';
import { fetchAllAccounts } from '../../core/data/fetch-accounts.js';
import type { Account } from '../../core/types/domain.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { type ToolInput } from '../../types.js';

// Define an empty schema with zod
const GetAccountsArgsSchema = z.object({});

export const schema = {
  name: 'get-accounts',
  description: 'Retrieve a list of all accounts with their current balance and ID.',
  inputSchema: zodToJsonSchema(GetAccountsArgsSchema) as ToolInput,
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const accounts: Account[] = await fetchAllAccounts();

    const structured = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type || 'Account',
      closed: account.closed,
      offBudget: account.offbudget,
    }));

    return successWithJson(structured);
  } catch (err) {
    return errorFromCatch(err);
  }
}
