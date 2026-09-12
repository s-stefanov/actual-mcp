// Orchestrator for budget-vs-actual tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { BudgetVsActualInputParser } from './input-parser.js';
import { BudgetVsActualDataFetcher } from './data-fetcher.js';
import { BudgetVsActualAggregator } from './budget-aggregator.js';
import { BudgetVsActualReportBuilder } from './report-builder.js';
import { successWithJson, errorFromCatch } from '../../utils/response.js';
import { getRecentMonths } from '../../utils.js';
import { BudgetVsActualArgsSchema, type BudgetVsActualArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'budget-vs-actual',
  description:
    'Compare budgeted amounts against actual spending per category, for recent months. Returns JSON; amounts are integer cents.',
  inputSchema: toJSONSchema(BudgetVsActualArgsSchema) as ToolInput,
};

export async function handler(args: BudgetVsActualArgs): Promise<CallToolResult> {
  try {
    const input = new BudgetVsActualInputParser().parse(args);
    const requestedMonths = getRecentMonths(input.months);

    const { budgetMonths, missingMonths } = await new BudgetVsActualDataFetcher().fetchMonths(requestedMonths);
    const months = new BudgetVsActualAggregator().aggregate(budgetMonths, {
      includeHidden: input.includeHidden,
      categoryGroupName: input.categoryGroupName,
    });

    const report = new BudgetVsActualReportBuilder().build({
      months,
      categoryGroupName: input.categoryGroupName,
      missingMonths,
    });

    return successWithJson(report);
  } catch (err) {
    return errorFromCatch(err);
  }
}
