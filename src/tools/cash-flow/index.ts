// Orchestrator for cash-flow tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { CashFlowInputParser } from './input-parser.js';
import { CashFlowDataFetcher } from './data-fetcher.js';
import { CashFlowCalculator } from './cash-flow-calculator.js';
import { CashFlowReportGenerator } from './report-generator.js';
import { success, errorFromCatch } from '../../utils/response.js';
import { getDateRangeForMonths } from '../../utils.js';
import { CashFlowArgsSchema, type CashFlowArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'cash-flow',
  description: 'Report income, expenses, and net cash flow per month or week',
  inputSchema: toJSONSchema(CashFlowArgsSchema) as ToolInput,
};

export async function handler(args: CashFlowArgs): Promise<CallToolResult> {
  try {
    const input = new CashFlowInputParser().parse(args);
    const { start, end } = getDateRangeForMonths(input.months);

    const { transactions, account } = await new CashFlowDataFetcher().fetchAll(input.accountId, start, end);
    const periods = new CashFlowCalculator().calculate(transactions, input.interval);

    const markdown = new CashFlowReportGenerator().generate({
      start,
      end,
      interval: input.interval,
      accountName: account?.name,
      periods,
    });

    return success(markdown);
  } catch (err) {
    return errorFromCatch(err);
  }
}
