// ----------------------------
// IMPORT TRANSACTIONS TOOL
// ----------------------------

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { utils } from '@actual-app/api';
import { toJSONSchema } from 'zod';
import { success, error, errorFromCatch } from '../../utils/response.js';
import { importTransactions } from '../../actual-api.js';
import { resolveTransferPayee } from '../../core/data/resolve-transfer-payee.js';
import { ImportTransactionsArgsSchema, type ImportTransactionsArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'import-transactions',
  description:
    'Import a list of transactions into an account using reconciliation logic. ' +
    'Deduplicates via imported_id to prevent duplicates on repeated imports. ' +
    'Supports dry-run mode to preview changes without persisting them. ' +
    'Supports transfers, including transfers originating from a single subtransaction of a split, via transfer_account_id.',
  inputSchema: toJSONSchema(ImportTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: ImportTransactionsArgs): Promise<CallToolResult> {
  try {
    const { accountId, transactions, defaultCleared, dryRun } = ImportTransactionsArgsSchema.parse(args);

    // Reason: A subtransaction can itself be a transfer leg (e.g. a split where part of the
    // amount is a purchase and part is a transfer to savings). Resolve each subtransaction's
    // transfer_account_id into the corresponding transfer payee before sending to the API.
    for (const t of transactions) {
      if (!t.subtransactions) continue;
      for (const sub of t.subtransactions) {
        if (sub.transfer_account_id) {
          const subTransferPayeeId = await resolveTransferPayee(sub.transfer_account_id);
          if (!subTransferPayeeId) {
            return error(
              `No transfer payee found for account ${sub.transfer_account_id}. Ensure the destination account exists.`
            );
          }
          sub.payee = subTransferPayeeId;
        }
        delete sub.transfer_account_id;
      }
    }

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
