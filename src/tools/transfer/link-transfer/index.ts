// ----------------------------
// LINK TRANSFER TOOL
// ----------------------------

import { z, toJSONSchema } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { success, error, errorFromCatch } from '../../../utils/response.js';
import { getAccounts, getTransactions, updateTransaction } from '../../../actual-api.js';
import { ToolInput } from '../../../types.js';

const LinkTransferArgsSchema = z.object({
  transactionId1: z.string().describe('ID of the first transaction'),
  transactionId2: z.string().describe('ID of the second transaction'),
});

type LinkTransferArgs = z.infer<typeof LinkTransferArgsSchema>;

export const schema = {
  name: 'link-transfer',
  description: 'Link two transactions as a transfer between accounts',
  inputSchema: toJSONSchema(LinkTransferArgsSchema) as ToolInput,
};

export async function handler(args: LinkTransferArgs): Promise<CallToolResult> {
  try {
    const { transactionId1: id1, transactionId2: id2 } = LinkTransferArgsSchema.parse(args);

    const accounts = await getAccounts();

    // No get-by-ID in @actual-app/api — must scan all accounts to find transactions by ID
    const allTransactions: Array<{ id: string; account: string; amount: number }> = [];
    for (const account of accounts) {
      const txs = await getTransactions(account.id, '2000-01-01', '2099-12-31');
      for (const tx of txs) {
        allTransactions.push(tx);
      }
    }

    const tx1 = allTransactions.find((t) => t.id === id1);
    const tx2 = allTransactions.find((t) => t.id === id2);

    if (!tx1) {
      return error(`transaction not found: ${id1}`);
    }
    if (!tx2) {
      return error(`transaction not found: ${id2}`);
    }

    if (tx1.account === tx2.account) {
      return error('transactions must be from different accounts to form a transfer');
    }

    if (tx1.amount + tx2.amount !== 0) {
      return error(`transaction amounts must be opposite (got ${tx1.amount} and ${tx2.amount})`);
    }

    const account1 = accounts.find((a) => a.id === tx1.account);
    const account2 = accounts.find((a) => a.id === tx2.account);

    await updateTransaction(id1, { transfer_id: id2 });
    try {
      await updateTransaction(id2, { transfer_id: id1 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return errorFromCatch(
        `linked ${id1} → ${id2} but failed to set reverse link: ${message}. ` +
          `You may need to manually update ${id2}.transfer_id = ${id1}`
      );
    }

    return success(
      `linked transfer: ${id1} (${account1?.name ?? tx1.account}, ${tx1.amount}) ↔ ${id2} (${account2?.name ?? tx2.account}, ${tx2.amount})`
    );
  } catch (err) {
    return errorFromCatch(err);
  }
}
