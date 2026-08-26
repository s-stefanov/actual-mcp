// Orchestrator for category-trends tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { CategoryTrendsInputParser } from './input-parser.js';
import { CategoryTrendsDataFetcher } from './data-fetcher.js';
import { CategoryTrendsAggregator } from './trend-aggregator.js';
import { CategoryTrendsReportGenerator } from './report-generator.js';
import { success, errorFromCatch } from '../../utils/response.js';
import { getDateRangeForMonths, getRecentMonths } from '../../utils.js';
import { CategoryTrendsArgsSchema, type CategoryTrendsArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'category-trends',
  description: 'Show how spending in each category changes month over month, with trend direction',
  inputSchema: toJSONSchema(CategoryTrendsArgsSchema) as ToolInput,
};

export async function handler(args: CategoryTrendsArgs): Promise<CallToolResult> {
  try {
    const input = new CategoryTrendsInputParser().parse(args);
    const months = getRecentMonths(input.months);
    const { start, end } = getDateRangeForMonths(input.months);

    const { transactions, categories, groups } = await new CategoryTrendsDataFetcher().fetchAll(start, end);
    const rows = new CategoryTrendsAggregator().aggregate(transactions, categories, groups, {
      months,
      includeIncome: input.includeIncome,
      categoryNames: input.categoryNames,
      categoryGroupName: input.categoryGroupName,
    });

    const markdown = new CategoryTrendsReportGenerator().generate({
      months,
      rows,
      includeIncome: input.includeIncome,
    });

    return success(markdown);
  } catch (err) {
    return errorFromCatch(err);
  }
}
