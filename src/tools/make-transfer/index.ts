// ----------------------------
// MAKE TRANSFER TOOL
// ----------------------------

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { success, errorFromCatch, error } from '../../utils/response.js';
import { getTransactionById, getPayees, makeTransfer } from '../../actual-api.js';
import { MakeTransferArgsSchema, type MakeTransferArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'make-transfer',
  description:
    'Link two existing transactions as a transfer pair. Equivalent to the "Make Transfer" action in the Actual Budget UI: ' +
    'updates both transactions to reference each other via transfer_id and sets the appropriate transfer payees. ' +
    'The two transactions must be in different accounts, have amounts that sum to zero, and neither may already be part of a transfer.',
  inputSchema: toJSONSchema(MakeTransferArgsSchema) as ToolInput,
};

export async function handler(args: MakeTransferArgs): Promise<CallToolResult> {
  try {
    const { fromId, toId } = MakeTransferArgsSchema.parse(args);

    if (fromId === toId) {
      return error('fromId and toId must be different transactions.');
    }

    const [fromTx, toTx] = await Promise.all([getTransactionById(fromId), getTransactionById(toId)]);

    if (!fromTx) {
      return error(`Transaction not found: ${fromId}`);
    }
    if (!toTx) {
      return error(`Transaction not found: ${toId}`);
    }

    // Reason: validation mirrors loot-core/shared/transfer.ts `validForTransfer`.
    // Both must be in different accounts, amounts must cancel out, and neither
    // can already be part of an existing transfer pair.
    if (fromTx.account === toTx.account) {
      return error('Both transactions are in the same account. A transfer requires two different accounts.');
    }
    if (fromTx.amount + toTx.amount !== 0) {
      return error(
        `Transaction amounts do not cancel out (${fromTx.amount} + ${toTx.amount} = ${fromTx.amount + toTx.amount}). A transfer requires opposite amounts.`
      );
    }
    if (fromTx.transfer_id != null || toTx.transfer_id != null) {
      return error('One or both transactions are already part of a transfer. Unlink them first before re-linking.');
    }

    const payees = await getPayees();
    const fromTransferPayee = payees.find((p) => p.transfer_acct === fromTx.account);
    const toTransferPayee = payees.find((p) => p.transfer_acct === toTx.account);

    if (!fromTransferPayee) {
      return error(`No transfer payee found for account ${fromTx.account}.`);
    }
    if (!toTransferPayee) {
      return error(`No transfer payee found for account ${toTx.account}.`);
    }

    await makeTransfer(fromTx, toTx, fromTransferPayee.id, toTransferPayee.id);

    return success(`Successfully linked transactions ${fromId} and ${toId} as a transfer pair.`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
