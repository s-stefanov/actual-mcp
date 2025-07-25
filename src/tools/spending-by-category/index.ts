// Orchestrator for spending-by-category tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SpendingByCategoryInputParser } from './input-parser.js';
import { SpendingByCategoryDataFetcher } from './data-fetcher.js';
import { CategoryMapper } from '../../core/mapping/category-mapper.js';
import { TransactionGrouper } from '../../core/aggregation/transaction-grouper.js';
import { GroupAggregator } from '../../core/aggregation/group-by.js';
import { SpendingByCategoryReportGenerator } from './report-generator.js';
import { success, errorFromCatch } from '../../utils/response.js';
import type { SpendingByCategoryInput } from './input-parser.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SpendingByCategoryArgsSchema, type SpendingByCategoryArgs, ToolInput, type Account } from '../../types.js';

export const schema = {
  name: 'spending-by-category',
  description: 'Get spending breakdown by category for a specified date range',
  inputSchema: zodToJsonSchema(SpendingByCategoryArgsSchema) as ToolInput,
};

export async function handler(args: SpendingByCategoryArgs): Promise<CallToolResult> {
  try {
    const input: SpendingByCategoryInput = new SpendingByCategoryInputParser().parse(args);
    const { startDate, endDate, accountId, includeIncome } = input;
    const { accounts, categories, categoryGroups, transactions } = await new SpendingByCategoryDataFetcher().fetchAll(
      accountId,
      startDate,
      endDate
    );
    const categoryMapper = new CategoryMapper(categories, categoryGroups);
    const spendingByCategory = new TransactionGrouper().groupByCategory(
      transactions,
      (categoryId) => categoryMapper.getCategoryName(categoryId),
      (categoryId) => categoryMapper.getGroupInfo(categoryId),
      includeIncome
    );
    const sortedGroups = new GroupAggregator().aggregateAndSort(spendingByCategory);

    let accountLabel = 'Accounts: All on-budget accounts';
    if (accountId) {
      const account: Account | undefined = accounts.find((a) => a.id === accountId);
      accountLabel = `Account: ${account ? account.name : accountId}`;
    }

    const markdown = new SpendingByCategoryReportGenerator().generate(
      sortedGroups,
      { start: startDate, end: endDate },
      accountLabel,
      includeIncome
    );
    return success(markdown);
  } catch (err) {
    return errorFromCatch(err);
  }
}
