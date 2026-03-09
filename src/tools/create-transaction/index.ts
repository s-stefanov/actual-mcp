// ----------------------------
// CREATE TRANSACTION TOOL
// ----------------------------

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { successWithJson, errorFromCatch, error } from '../../utils/response.js';
import { createTransaction, getPayees } from '../../actual-api.js';
import { CreateTransactionArgsSchema, type CreateTransactionArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'create-transaction',
  description:
    'Create a new transaction. Use this to add transactions to accounts. Supports transfers between accounts by specifying transfer_account_id.',
  inputSchema: toJSONSchema(CreateTransactionArgsSchema) as ToolInput,
};

/**
 * Resolve the transfer payee ID for a given destination account.
 * Each account in Actual has a corresponding payee with transfer_acct set.
 */
async function resolveTransferPayee(destinationAccountId: string): Promise<string | null> {
  const payees = await getPayees();
  const transferPayee = payees.find((p) => p.transfer_acct === destinationAccountId);
  return transferPayee?.id ?? null;
}

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

    const id: string = await createTransaction(accountId, transactionData);

    const message = transfer_account_id
      ? `Successfully created transfer transaction ${id} (counterpart created in destination account)`
      : `Successfully created transaction ${id}`;

    return successWithJson(message);
  } catch (err) {
    return errorFromCatch(err);
  }
}
