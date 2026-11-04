// Orchestrator for get-transactions tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GetTransactionsInputParser } from './input-parser.js';
import { GetTransactionsDataFetcher, resolveCategory } from './data-fetcher.js';
import { GetTransactionsMapper } from './transaction-mapper.js';
import { GetTransactionsReportGenerator } from './report-generator.js';
import { error, success, errorFromCatch } from '../../utils/response.js';
import { getDateRange } from '../../utils.js';
import { fetchAllCategories } from '../../core/data/fetch-categories.js';
import { GetTransactionsArgsSchema, type GetTransactionsArgs, type ToolInput } from '../../types.js';
import { toJSONSchema } from 'zod';

export const schema = {
  name: 'get-transactions',
  description:
    'Get transactions with optional filtering, for one account or across all accounts if accountId is omitted. ' +
    'Filters run in the database, so filtering by category, payee, amount, or date is efficient on large budgets. ' +
    'Split transactions are returned whole when any of their lines match. Results are newest first; use limit ' +
    'and offset to page. To categorize, pass uncategorized: true with includePayeeHistory: true to get ' +
    'transactions that need a category plus the categories each payee has had before, then assign categories ' +
    'with update-transaction.',
  inputSchema: toJSONSchema(GetTransactionsArgsSchema) as ToolInput,
};

export async function handler(args: GetTransactionsArgs): Promise<CallToolResult> {
  try {
    const input = new GetTransactionsInputParser().parse(args);
    const { accountId, minAmount, maxAmount, payeeName, uncategorized, includePayeeHistory, limit } = input;
    const offset = input.offset ?? 0;

    if (uncategorized && (input.categoryId || input.categoryName)) {
      return error('uncategorized cannot be combined with categoryId or categoryName.');
    }

    let categoryId = input.categoryId;
    let categoryLabel = categoryId;
    if (!categoryId && input.categoryName) {
      const category = resolveCategory(await fetchAllCategories(), input.categoryName);
      categoryId = category.id;
      categoryLabel = category.name;
    }

    // Reason: looking up a category, payee, or what is uncategorized means "all transactions
    // in X", so with no dates given it spans all time. A plain listing keeps the 3-month
    // default so it stays small.
    const isSearch = Boolean(categoryId || payeeName || uncategorized);
    const { startDate, endDate } =
      isSearch && !input.startDate && !input.endDate
        ? { startDate: undefined, endDate: undefined }
        : getDateRange(input.startDate, input.endDate);

    const fetcher = new GetTransactionsDataFetcher();
    const { transactions, total } = await fetcher.fetch({
      accountId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      categoryId,
      payeeName,
      uncategorized,
      limit,
      offset,
    });

    const mapped = new GetTransactionsMapper().map(transactions);

    const filterDescription = [
      startDate || endDate ? `Date range: ${startDate ?? 'start'} to ${endDate ?? 'end'}` : 'Date range: all dates',
      minAmount !== undefined ? `Min amount: $${minAmount.toFixed(2)}` : null,
      maxAmount !== undefined ? `Max amount: $${maxAmount.toFixed(2)}` : null,
      categoryLabel ? `Category: ${categoryLabel}` : null,
      payeeName ? `Payee: ${payeeName}` : null,
      uncategorized ? 'Uncategorized only' : null,
      offset > 0 ? `Offset: ${offset}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const generator = new GetTransactionsReportGenerator();
    let markdown = generator.generate(mapped, filterDescription, mapped.length, total);
    const nextOffset = offset + mapped.length;
    if (nextOffset < total) {
      markdown += `\n\nMore transactions match. Call again with offset=${nextOffset} to see the next page.`;
    }
    if (includePayeeHistory) {
      markdown += generator.generatePayeeHistory(await fetcher.fetchPayeeHistory(transactions), transactions);
    }
    return success(markdown);
  } catch (err) {
    return errorFromCatch(err);
  }
}
