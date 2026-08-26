// Orchestrator for spending-by-payee tool
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { SpendingByPayeeInputParser } from './input-parser.js';
import { SpendingByPayeeDataFetcher } from './data-fetcher.js';
import { PayeeAggregator } from './payee-aggregator.js';
import { SpendingByPayeeReportBuilder } from './report-builder.js';
import { successWithJson, errorFromCatch } from '../../utils/response.js';
import { getDateRange } from '../../utils.js';
import { SpendingByPayeeArgsSchema, type SpendingByPayeeArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'spending-by-payee',
  description:
    'Rank payees by how much money was spent with (or received from) each one. Returns JSON; amounts are integer cents.',
  inputSchema: toJSONSchema(SpendingByPayeeArgsSchema) as ToolInput,
};

export async function handler(args: SpendingByPayeeArgs): Promise<CallToolResult> {
  try {
    const input = new SpendingByPayeeInputParser().parse(args);
    const { startDate, endDate } = getDateRange(input.startDate, input.endDate);

    const { transactions, account } = await new SpendingByPayeeDataFetcher().fetchAll(
      input.accountId,
      startDate,
      endDate
    );
    const allPayees = new PayeeAggregator().aggregate(transactions, input.includeIncome);

    const report = new SpendingByPayeeReportBuilder().build({
      start: startDate,
      end: endDate,
      accountName: account?.name,
      includeIncome: input.includeIncome,
      payees: allPayees.slice(0, input.limit),
      totalListed: allPayees.length,
      grandTotal: allPayees.reduce((sum, payee) => sum + payee.total, 0),
    });

    return successWithJson(report);
  } catch (err) {
    return errorFromCatch(err);
  }
}
