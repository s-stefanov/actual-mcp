// ----------------------------
// RUN BANK SYNC TOOL
// ----------------------------

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { success, errorFromCatch } from '../../utils/response.js';
import { runBankSync } from '../../actual-api.js';
import type { ToolInput } from '../../types.js';

const RunBankSyncArgsSchema = z.object({
  accountId: z
    .string()
    .optional()
    .describe(
      'Account ID to sync, or special value: "onbudget" (all on-budget), ' +
        '"offbudget" (all off-budget). If omitted, syncs ALL linked accounts.'
    ),
});

type RunBankSyncArgs = z.infer<typeof RunBankSyncArgsSchema>;

export const schema = {
  name: 'run-bank-sync',
  description:
    'Run bank synchronization (GoCardless/SimpleFIN) to download latest transactions. ' +
    'Provide accountId for a specific account, use "onbudget"/"offbudget" for groups, ' +
    'or omit to sync all linked accounts.',
  inputSchema: zodToJsonSchema(RunBankSyncArgsSchema) as ToolInput,
};

export async function handler(args: RunBankSyncArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = RunBankSyncArgsSchema.parse(args);
    const { accountId } = validatedArgs;

    // API handles all sync logic natively:
    // - specific ID → sync that account
    // - "onbudget" → sync on-budget accounts
    // - "offbudget" → sync off-budget accounts
    // - undefined → sync ALL linked accounts
    await runBankSync(accountId);

    // Build user-friendly response
    let message: string;
    if (!accountId) {
      message = 'Bank sync completed for all linked accounts.';
    } else if (accountId === 'onbudget') {
      message = 'Bank sync completed for all on-budget linked accounts.';
    } else if (accountId === 'offbudget') {
      message = 'Bank sync completed for all off-budget linked accounts.';
    } else {
      message = `Bank sync completed for account: ${accountId}`;
    }

    return success(message);
  } catch (err) {
    return errorFromCatch(err);
  }
}
