import { getPayees } from '../../actual-api.js';

/**
 * Resolve the transfer payee ID for a given destination account.
 * Each account in Actual has a corresponding payee with transfer_acct set;
 * assigning that payee to a transaction (or a split's subtransaction) turns
 * it into a transfer leg — the counterpart transaction is created automatically
 * when the write is done with runTransfers enabled (the default).
 */
export async function resolveTransferPayee(destinationAccountId: string): Promise<string | null> {
  const payees = await getPayees();
  const transferPayee = payees.find((p) => p.transfer_acct === destinationAccountId);
  return transferPayee?.id ?? null;
}
