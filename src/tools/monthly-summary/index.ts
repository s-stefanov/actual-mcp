import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MonthlySummaryInputParser } from './input-parser.js';
import { MonthlySummaryDataFetcher } from './data-fetcher.js';
import { MonthlySummaryCategoryClassifier } from './category-classifier.js';
import { MonthlySummaryTransactionAggregator } from './transaction-aggregator.js';
import { MonthlySummaryCalculator } from './summary-calculator.js';
import { MonthlySummaryReportDataBuilder } from './report-data-builder.js';
import { MonthlySummaryReportGenerator } from './report-generator.js';
import { successWithContent, errorFromCatch } from '../../utils/response.js';
import { getDateRangeForMonths } from '../../utils.js';
import { MonthlySummaryArgsSchema, type MonthlySummaryArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'monthly-summary',
  description: 'Get monthly income, expenses, and savings',
  inputSchema: zodToJsonSchema(MonthlySummaryArgsSchema) as ToolInput,
};

export async function handler(args: MonthlySummaryArgs): Promise<CallToolResult> {
  try {
    const input = new MonthlySummaryInputParser().parse(args);
    const { start, end } = getDateRangeForMonths(input.months);

    const { accounts, categories, transactions } = await new MonthlySummaryDataFetcher().fetchAll(
      input.accountId,
      start,
      end
    );
    const { incomeCategories, investmentSavingsCategories } = new MonthlySummaryCategoryClassifier().classify(
      categories
    );
    const sortedMonths = new MonthlySummaryTransactionAggregator().aggregate(
      transactions,
      incomeCategories,
      investmentSavingsCategories
    );
    const averages = new MonthlySummaryCalculator().calculateAverages(sortedMonths);
    const reportData = new MonthlySummaryReportDataBuilder().build(
      start,
      end,
      input.accountId,
      accounts,
      sortedMonths,
      averages
    );
    const markdown = new MonthlySummaryReportGenerator().generate(reportData);

    return successWithContent({ type: 'text', text: markdown });
  } catch (err) {
    // Use the standardized error response
    // errorFromCatch is imported from ../../utils/response.js
    return errorFromCatch(err);
  }
}
