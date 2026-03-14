import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { success, errorFromCatch } from '../../utils/response.js';
import { getAccounts, getTransactions, getPayees } from '../../actual-api.js';
import { getDateRange, formatAmount } from '../../utils.js';
import {
  GetUncategorizedTransactionsArgsSchema,
  type GetUncategorizedTransactionsArgs,
  type ToolInput,
} from '../../types.js';

export const schema = {
  name: 'get-uncategorized-transactions',
  description:
    'Get all uncategorized transactions across all on-budget accounts. Useful for reviewing and categorizing transactions that have not been assigned a category.',
  inputSchema: toJSONSchema(GetUncategorizedTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: GetUncategorizedTransactionsArgs): Promise<CallToolResult> {
  try {
    const { startDate, endDate } = GetUncategorizedTransactionsArgsSchema.parse(args);
    const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

    const accounts = await getAccounts();
    const onBudget = accounts.filter((a) => !a.offbudget);

    const payees = await getPayees();
    const payeeMap = new Map(payees.map((p) => [p.id, p.name]));

    const results: Array<{
      id: string;
      date: string;
      accountName: string;
      amount: string;
      payee: string;
      notes: string;
      cleared: boolean;
    }> = [];

    for (const account of onBudget) {
      const txns = await getTransactions(account.id, start, end);
      for (const txn of txns) {
        // null, undefined, or empty string means uncategorized
        if (txn.category == null || txn.category === '') {
          results.push({
            id: txn.id,
            date: txn.date,
            accountName: account.name,
            amount: formatAmount(txn.amount),
            payee: (txn.payee != null ? payeeMap.get(txn.payee) : undefined) ?? txn.payee ?? '',
            notes: txn.notes ?? '',
            cleared: txn.cleared ?? false,
          });
        }
      }
    }

    if (results.length === 0) {
      return success(`No uncategorized transactions found between ${start} and ${end}.`);
    }

    const lines = [
      `## Uncategorized Transactions (${results.length})`,
      `Date range: ${start} to ${end}`,
      '',
      '| ID | Date | Account | Amount | Payee | Notes | Cleared |',
      '|---|---|---|---|---|---|---|',
      ...results.map(
        (r) =>
          `| ${r.id} | ${r.date} | ${r.accountName} | ${r.amount} | ${r.payee} | ${r.notes} | ${r.cleared ? 'yes' : 'no'} |`
      ),
    ];

    return success(lines.join('\n'));
  } catch (err) {
    return errorFromCatch(err);
  }
}
