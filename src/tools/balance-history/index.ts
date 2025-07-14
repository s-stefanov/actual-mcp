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
  description: "Get account balance history over time",
  inputSchema: {
    type: "object",
    properties: {
      accountId: {
        type: "string",
        description:
          "ID of the account to get balance history for. Should be in UUID format and retrieved from the accounts resource.",
      },
      months: {
        type: "number",
        description: "Number of months to include",
        default: 12,
      },
    },
    required: ["accountId"],
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
    const { accounts, account, transactions, currentBalance } =
      await new BalanceHistoryDataFetcher().fetchAll(accountId, start, end);
    if (!account) {
      return errorFromCatch(`Account with ID ${accountId} not found`);
    }

    // Calculate balance history
    const sortedMonths = new BalanceHistoryCalculator().calculate(
      transactions,
      currentBalance,
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
