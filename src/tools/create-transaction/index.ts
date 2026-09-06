// ----------------------------
// CREATE TRANSACTION TOOL
// ----------------------------

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { successWithJson, errorFromCatch, error } from '../../utils/response.js';
import { createTransaction } from '../../actual-api.js';
import { resolveTransferPayee } from '../../core/data/resolve-transfer-payee.js';
import { CreateTransactionArgsSchema, type CreateTransactionArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'create-transaction',
  description:
    'Create a new transaction. Use this to add transactions to accounts. Supports transfers between accounts by ' +
    'specifying transfer_account_id, including transfers originating from a single subtransaction of a split.',
  inputSchema: toJSONSchema(CreateTransactionArgsSchema) as ToolInput,
};

export async function handler(args: CreateTransactionArgs): Promise<CallToolResult> {
  try {
    // Validate with Zod schema
    const validatedArgs = CreateTransactionArgsSchema.parse(args);

    const { account: accountId, transfer_account_id, ...transactionData } = validatedArgs;

    // Reason: When transfer_account_id is provided, look up the transfer payee
    // so that addTransactions (with runTransfers: true) creates the counterpart automatically.
    if (transfer_account_id) {
      const transferPayeeId = await resolveTransferPayee(transfer_account_id);
      if (!transferPayeeId) {
        return error(
          `No transfer payee found for account ${transfer_account_id}. Ensure the destination account exists.`
        );
      }
      transactionData.payee = transferPayeeId;
    }

    // Reason: A subtransaction can itself be a transfer leg (e.g. a split where part of the
    // amount is a purchase and part is a transfer to savings). Resolve each subtransaction's
    // transfer_account_id into the corresponding transfer payee before sending to the API.
    let hasSubtransactionTransfer = false;
    if (transactionData.subtransactions) {
      for (const sub of transactionData.subtransactions) {
        if (sub.transfer_account_id) {
          const subTransferPayeeId = await resolveTransferPayee(sub.transfer_account_id);
          if (!subTransferPayeeId) {
            return error(
              `No transfer payee found for account ${sub.transfer_account_id}. Ensure the destination account exists.`
            );
          }
          sub.payee = subTransferPayeeId;
          hasSubtransactionTransfer = true;
        }
        delete sub.transfer_account_id;
      }
    }

    const id: string = await createTransaction(accountId, transactionData);

    const message =
      transfer_account_id || hasSubtransactionTransfer
        ? `Successfully created transfer transaction ${id} (counterpart created in destination account)`
        : `Successfully created transaction ${id}`;

    return successWithJson(message);
  } catch (err) {
    return errorFromCatch(err);
  }
}
