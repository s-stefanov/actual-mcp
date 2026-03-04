import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { success, errorFromCatch } from '../../utils/response.js';
import { getAccounts, getTransactions, getPayees, getCategories } from '../../actual-api.js';
import { getDateRange, formatAmount } from '../../utils.js';
import { QueryTransactionsArgsSchema, type QueryTransactionsArgs, type ToolInput } from '../../types.js';

export const schema = {
  name: 'query-transactions',
  description:
    'Query transactions with filters and get aggregate statistics (count, total, average). Useful for answering questions like "how much did I spend on Food in February?" without fetching all transactions.',
  inputSchema: toJSONSchema(QueryTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: QueryTransactionsArgs): Promise<CallToolResult> {
  try {
    const { category, payee, startDate, endDate, accountId } = QueryTransactionsArgsSchema.parse(args);
    const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

    const accounts = await getAccounts();
    const targetAccounts = accountId
      ? accounts.filter((a) => a.id === accountId)
      : accounts.filter((a) => !a.offbudget && !a.closed);

    // Build lookup maps only when needed
    let categoryMap: Map<string, string> | undefined;
    if (category) {
      const categories = await getCategories();
      categoryMap = new Map(
        categories
          .filter((c): c is { id: string; name: string; group_id: string } => 'group_id' in c)
          .map((c) => [c.id, c.name])
      );
    }

    let payeeMap: Map<string, string> | undefined;
    if (payee) {
      const payees = await getPayees();
      payeeMap = new Map(payees.map((p) => [p.id, p.name]));
    }

    const allTransactions: Array<{
      id: string;
      date: string;
      amount: number;
      payee?: string | null;
      category?: string | null;
    }> = [];
    for (const account of targetAccounts) {
      const txns = await getTransactions(account.id, start, end);
      allTransactions.push(...txns);
    }

    // Apply filters
    let filtered = allTransactions;
    if (category && categoryMap) {
      filtered = filtered.filter((t) => {
        const catName = t.category ? categoryMap!.get(t.category) : undefined;
        return catName?.toLowerCase() === category.toLowerCase();
      });
    }
    if (payee && payeeMap) {
      filtered = filtered.filter((t) => {
        const payeeName = t.payee ? payeeMap!.get(t.payee) : undefined;
        return payeeName?.toLowerCase() === payee.toLowerCase();
      });
    }

    if (filtered.length === 0) {
      const filters = [];
      if (category) filters.push(`category: ${category}`);
      if (payee) filters.push(`payee: ${payee}`);
      if (accountId) filters.push(`account: ${accountId}`);
      const filterDesc = filters.length > 0 ? ` matching ${filters.join(', ')}` : '';
      return success(`No transactions found${filterDesc} between ${start} and ${end}.`);
    }

    const total = filtered.reduce((sum, t) => sum + t.amount, 0);
    const count = filtered.length;
    const average = Math.round(total / count);

    const filters = [];
    if (category) filters.push(`Category: ${category}`);
    if (payee) filters.push(`Payee: ${payee}`);
    if (accountId) {
      const account = accounts.find((a) => a.id === accountId);
      filters.push(`Account: ${account ? account.name : accountId}`);
    }

    const lines = [
      '## Transaction Summary',
      `Date range: ${start} to ${end}`,
      ...(filters.length > 0 ? ['Filters: ' + filters.join(' | ')] : []),
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Count | ${count} |`,
      `| Total | ${formatAmount(total)} |`,
      `| Average | ${formatAmount(average)} |`,
    ];

    return success(lines.join('\n'));
  } catch (err) {
    return errorFromCatch(err);
  }
}
