// ----------------------------
// IMPORT TRANSACTIONS TOOL
// ----------------------------

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { utils } from '@actual-app/api';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../utils/response.js';
import { importTransactions } from '../../actual-api.js';
import { ImportTransactionsArgsSchema, type ImportTransactionsArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'import-transactions',
  description:
    'Import a list of transactions into an account using reconciliation logic. ' +
    'Deduplicates via imported_id to prevent duplicates on repeated imports. ' +
    'Supports dry-run mode to preview changes without persisting them.',
  inputSchema: zodToJsonSchema(ImportTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: ImportTransactionsArgs): Promise<CallToolResult> {
  try {
    const { accountId, transactions, defaultCleared, dryRun } = ImportTransactionsArgsSchema.parse(args);

    // Reason: decimal amounts (e.g. 3.24) from the tool input are converted to integers (e.g. 324)
    // here before being passed to the API, which expects integer cents.
    const entities = transactions.map((t) => ({
      ...t,
      account: accountId,
      amount: utils.amountToInteger(t.amount),
      subtransactions: t.subtransactions?.map((s) => ({
        ...s,
        amount: utils.amountToInteger(s.amount),
      })),
    }));

    const result = await importTransactions(accountId, entities, { defaultCleared, dryRun });

    const prefix = dryRun ? '[DRY RUN] ' : '';
    const summary =
      `${prefix}Import complete.\n` +
      `Added: ${result.added.length} transaction(s)\n` +
      `Updated: ${result.updated.length} transaction(s)\n` +
      (result.errors.length > 0 ? `Errors: ${result.errors.map((e) => e.message).join(', ')}` : 'Errors: none');

    return success(summary);
  } catch (err) {
    return errorFromCatch(err);
  }
}
