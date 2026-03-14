// ----------------------------
// GET ACCOUNT BALANCE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../utils/response.js';
import { getAccountBalance } from '@actual-app/api';
import { formatAmount } from '../../utils.js';
import { toJSONSchema } from 'zod';
import { GetAccountBalanceArgsSchema, type ToolInput } from '../../types.js';

export const schema = {
  name: 'get-account-balance',
  description: 'Get the current balance for a specific account by ID.',
  inputSchema: toJSONSchema(GetAccountBalanceArgsSchema) as ToolInput,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const parsed = GetAccountBalanceArgsSchema.safeParse(args);
    if (!parsed.success) {
      return errorFromCatch(parsed.error.issues[0]?.message ?? 'Invalid arguments');
    }

    const { accountId } = parsed.data;
    const balance = await getAccountBalance(accountId);

    return successWithJson({
      accountId,
      balance,
      balanceFormatted: formatAmount(balance),
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
