// Orchestrator for spending-by-category tool
import { SpendingByCategoryInputParser } from "./input-parser.js";
import { SpendingByCategoryDataFetcher } from "./data-fetcher.js";
import { CategoryMapper } from "../../core/mapping/category-mapper.js";
import { TransactionGrouper } from "../../core/aggregation/transaction-grouper.js";
import { GroupAggregator } from "../../core/aggregation/group-by.js";
import { SpendingByCategoryReportGenerator } from "./report-generator.js";
import { success, errorFromCatch } from "../../utils/response.js";
import type { SpendingByCategoryInput } from "./input-parser.js";
import type { Account } from "../../types.js";

export const schema = {
  name: "spending-by-category",
  description: "Get spending breakdown by category for a specified date range",
  inputSchema: {
    type: "object",
    properties: {
      startDate: {
        type: "string",
        description: "Start date in YYYY-MM-DD format",
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format",
      },
      accountId: {
        type: "string",
        description:
          "Optional ID of a specific account to analyze. If not provided, all on-budget accounts will be used.",
      },
      includeIncome: {
        type: "boolean",
        description:
          "Whether to include income categories in the report (default: false)",
      },
    },
  },
};

export async function handler(args: any) {
  try {
    const input: SpendingByCategoryInput =
      new SpendingByCategoryInputParser().parse(args);
    const { startDate, endDate, accountId, includeIncome } = input;
    const { accounts, categories, categoryGroups, transactions } =
      await new SpendingByCategoryDataFetcher().fetchAll(
        accountId,
        startDate,
        endDate
      );
    const categoryMapper = new CategoryMapper(categories, categoryGroups);
    const spendingByCategory = new TransactionGrouper().groupByCategory(
      transactions,
      (categoryId) => categoryMapper.getCategoryName(categoryId),
      (categoryId) => categoryMapper.getGroupInfo(categoryId),
      includeIncome
    );
    const sortedGroups = new GroupAggregator().aggregateAndSort(
      spendingByCategory
    );

    let accountLabel = "Accounts: All on-budget accounts";
    if (accountId) {
      const account: Account | undefined = accounts.find(
        (a) => a.id === accountId
      );
      accountLabel = `Account: ${account ? account.name : accountId}`;
    }

    const markdown = new SpendingByCategoryReportGenerator().generate(
      sortedGroups,
      { start: startDate, end: endDate },
      accountLabel,
      includeIncome
    );
    return success(markdown);
  } catch (err) {
    return errorFromCatch(err);
  }
}
