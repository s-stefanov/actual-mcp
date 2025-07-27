// Orchestrator for balance-history tool
import { BalanceHistoryInputParser } from "./input-parser.js";
import { BalanceHistoryDataFetcher } from "./data-fetcher.js";
import { BalanceHistoryCalculator } from "./balance-calculator.js";
import { BalanceHistoryReportGenerator } from "./report-generator.js";
import { success, errorFromCatch } from "../../utils/response.js";
import { formatDate } from "../../utils.js";
import type { BalanceHistoryArgs } from "./types.js";

export const schema = {
  name: "balance-history",
  description: "Get balance history over time",
  inputSchema: {
    type: "object",
    properties: {
      accountId: {
        type: "string",
        description:
          "Optional ID of a specific account to get balance history of. If not provided, all on-budget accounts will be used.",
      },
      months: {
        type: "number",
        description: "Number of months to include",
        default: 12,
      },
    },
  },
};

export async function handler(args: BalanceHistoryArgs) {
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
    const { account, accounts, transactions } =
      await new BalanceHistoryDataFetcher().fetchAll(accountId, start, end);

    // Calculate balance history
    const sortedMonths = new BalanceHistoryCalculator().calculate(
      account,
      accounts,
      transactions,
      months,
      endDate
    );

    // Generate report
    const markdown = new BalanceHistoryReportGenerator().generate(
      account,
      { start, end },
      sortedMonths
    );
    return success(markdown);
  } catch (err) {
    return errorFromCatch(err);
  }
}
