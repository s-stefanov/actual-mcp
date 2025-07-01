import { MonthlySummaryInputParser } from "./input-parser.js";
import { MonthlySummaryDataFetcher } from "./data-fetcher.js";
import { MonthlySummaryCategoryClassifier } from "./category-classifier.js";
import { MonthlySummaryTransactionAggregator } from "./transaction-aggregator.js";
import { MonthlySummaryCalculator } from "./summary-calculator.js";
import { MonthlySummaryReportDataBuilder } from "./report-data-builder.js";
import { MonthlySummaryReportGenerator } from "./report-generator.js";
import { successWithContent, errorFromCatch } from "../../utils/response.js";
import { getDateRangeForMonths } from "../../utils.js";

export const schema = {
  name: "monthly-summary",
  description: "Get monthly income, expenses, and savings",
  inputSchema: {
    type: "object",
    properties: {
      months: {
        type: "number",
        description: "Number of months to include",
        default: 3,
      },
      accountId: {
        type: "string",
        description:
          "Limit to a specific account ID. Should be in UUID format and retrieved from the accounts resource.",
      },
    },
  },
};

export async function handler(args: any) {
  try {
    const input = new MonthlySummaryInputParser().parse(args);
    const { start, end } = getDateRangeForMonths(input.months);

    const { accounts, categories, transactions } =
      await new MonthlySummaryDataFetcher().fetchAll(
        input.accountId,
        start,
        end
      );
    const { incomeCategories, investmentSavingsCategories } =
      new MonthlySummaryCategoryClassifier().classify(categories);
    const sortedMonths = new MonthlySummaryTransactionAggregator().aggregate(
      transactions,
      incomeCategories,
      investmentSavingsCategories
    );
    const averages = new MonthlySummaryCalculator().calculateAverages(
      sortedMonths
    );
    const reportData = new MonthlySummaryReportDataBuilder().build(
      start,
      end,
      input.accountId,
      accounts,
      sortedMonths,
      averages
    );
    const markdown = new MonthlySummaryReportGenerator().generate(reportData);

    return successWithContent({ type: "text", text: markdown });
  } catch (err) {
    // Use the standardized error response
    // errorFromCatch is imported from ../../utils/response.js
    return errorFromCatch(err);
  }
}
