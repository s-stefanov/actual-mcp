// Orchestrator for net-worth tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { NetWorthInputParser } from './input-parser.js';
import { NetWorthDataFetcher } from './data-fetcher.js';
import { NetWorthCalculator } from './net-worth-calculator.js';
import { NetWorthReportGenerator } from './report-generator.js';
import { success, errorFromCatch } from '../../utils/response.js';
import { getRecentMonths } from '../../utils.js';
import { NetWorthArgsSchema, type NetWorthArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'net-worth',
  description: 'Track assets, liabilities, and net worth across all accounts over time',
  inputSchema: toJSONSchema(NetWorthArgsSchema) as ToolInput,
};

export async function handler(args: NetWorthArgs): Promise<CallToolResult> {
  try {
    const input = new NetWorthInputParser().parse(args);
    const months = getRecentMonths(input.months);

    const balancesByMonth = await new NetWorthDataFetcher().fetchBalances(months, {
      includeOffBudget: input.includeOffBudget,
      includeClosed: input.includeClosed,
    });
    const rows = new NetWorthCalculator().calculate(months, balancesByMonth);

    const markdown = new NetWorthReportGenerator().generate({
      months: rows,
      includeOffBudget: input.includeOffBudget,
      includeClosed: input.includeClosed,
    });

    return success(markdown);
  } catch (err) {
    return errorFromCatch(err);
  }
}
