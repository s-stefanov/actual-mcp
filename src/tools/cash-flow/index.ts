// Orchestrator for cash-flow tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { CashFlowInputParser } from './input-parser.js';
import { CashFlowDataFetcher } from './data-fetcher.js';
import { CashFlowCalculator } from './cash-flow-calculator.js';
import { CashFlowReportBuilder } from './report-builder.js';
import { successWithJson, errorFromCatch } from '../../utils/response.js';
import { getDateRangeForMonths } from '../../utils.js';
import { CashFlowArgsSchema, type CashFlowArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'cash-flow',
  description: 'Report income, expenses, and net cash flow per month or week. Returns JSON; amounts are integer cents.',
  inputSchema: toJSONSchema(CashFlowArgsSchema) as ToolInput,
};

export async function handler(args: CashFlowArgs): Promise<CallToolResult> {
  try {
    const input = new CashFlowInputParser().parse(args);
    const { start, end } = getDateRangeForMonths(input.months);

    const { transactions, account } = await new CashFlowDataFetcher().fetchAll(input.accountId, start, end);
    const periods = new CashFlowCalculator().calculate(transactions, input.interval);

    const report = new CashFlowReportBuilder().build({
      start,
      end,
      interval: input.interval,
      accountName: account?.name,
      periods,
    });

    return successWithJson(report);
  } catch (err) {
    return errorFromCatch(err);
  }
}
