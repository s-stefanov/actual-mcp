// ----------------------------
// RUN BANK SYNC TOOL
// ----------------------------

import { z, toJSONSchema } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { success, errorFromCatch } from '../../utils/response.js';
import { runBankSync } from '../../actual-api.js';
import type { ToolInput } from '../../types.js';

const RunBankSyncArgsSchema = z.object({
  accountId: z.string().optional().describe('Account ID to sync. If omitted, syncs all linked accounts.'),
});

type RunBankSyncArgs = z.infer<typeof RunBankSyncArgsSchema>;

export const schema = {
  name: 'run-bank-sync',
  description:
    'Run bank synchronization (GoCardless/SimpleFIN) to download latest transactions. ' +
    'Provide accountId for a specific account or omit it to sync all linked accounts.',
  inputSchema: toJSONSchema(RunBankSyncArgsSchema) as ToolInput,
};

export async function handler(args: RunBankSyncArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = RunBankSyncArgsSchema.parse(args);
    const { accountId } = validatedArgs;

    await runBankSync(accountId);

    // Build user-friendly response
    let message: string;
    if (!accountId) {
      message = 'Bank sync completed for all linked accounts.';
    } else {
      message = `Bank sync completed for account: ${accountId}`;
    }

    return success(message);
  } catch (err) {
    return errorFromCatch(err);
  }
}
