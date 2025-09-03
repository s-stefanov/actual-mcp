// Orchestrator for balance-history tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BalanceHistoryInputParser } from './input-parser.js';
import { BalanceHistoryDataFetcher } from './data-fetcher.js';
import { BalanceHistoryCalculator } from './balance-calculator.js';
import { BalanceHistoryReportGenerator } from './report-generator.js';
import { success, errorFromCatch } from '../../utils/response.js';
import { formatDate } from '../../utils.js';
import { BalanceHistoryArgsSchema, type BalanceHistoryArgs, ToolInput } from '../../types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const schema = {
  name: 'balance-history',
  description: 'Get account balance history over time',
  inputSchema: zodToJsonSchema(BalanceHistoryArgsSchema) as ToolInput,
};

export async function handler(args: BalanceHistoryArgs): Promise<CallToolResult> {
  try {
    const input = new BalanceHistoryInputParser().parse(args);
    const { accountId, months } = input;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    // Fetch data
    const { account, accounts, transactions } = await new BalanceHistoryDataFetcher().fetchAll(accountId, start, end);

    // Calculate balance history
    const sortedMonths = new BalanceHistoryCalculator().calculate(account, accounts, transactions, months, endDate);

    // Generate report
    const markdown = new BalanceHistoryReportGenerator().generate(account, { start, end }, sortedMonths);
    return success(markdown);
  } catch (err) {
    return errorFromCatch(err);
  }
}
