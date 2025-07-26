// Orchestrator for get-transactions tool
import { GetTransactionsInputParser } from "./input-parser.js";
import { GetTransactionsDataFetcher } from "./data-fetcher.js";
import { GetTransactionsMapper } from "./transaction-mapper.js";
import { GetTransactionsReportGenerator } from "./report-generator.js";
import { success, errorFromCatch } from "../../utils/response.js";
import { getDateRange } from "../../utils.js";
import type { GetTransactionsArgs } from "./types.js";

export const schema = {
  name: "get-transactions",
  description: "Get transactions for an account with optional filtering",
  inputSchema: {
    type: "object",
    properties: {
      accountId: {
        type: "string",
        description:
          "ID of the account to get transactions for. Should be in UUID format and retrieved from the accounts resource.",
      },
      startDate: {
        type: "string",
        description: "Start date in YYYY-MM-DD format",
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format",
      },
      minAmount: {
        type: "number",
        description: "Minimum transaction amount in dollars",
      },
      maxAmount: {
        type: "number",
        description: "Maximum transaction amount in dollars",
      },
      category: {
        type: "string",
        description: "Filter by category name",
      },
      payee: {
        type: "string",
        description: "Filter by payee name",
      },
      limit: {
        type: "number",
        description: "Maximum number of transactions to return",
      },
    },
    required: ["accountId"],
  },
};

export async function handler(args: GetTransactionsArgs) {
  try {
    const input = new GetTransactionsInputParser().parse(args);
    const {
      accountId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      category,
      payee,
      limit,
    } = input;
    const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

    // Fetch transactions
    const transactions = await new GetTransactionsDataFetcher().fetch(
      accountId,
      start,
      end
    );
    let filtered = [...transactions];

    if (minAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount >= minAmount * 100);
    }
    if (maxAmount !== undefined) {
      filtered = filtered.filter((t) => t.amount <= maxAmount * 100);
    }
    if (category) {
      const lowerCategory = category.toLowerCase();
      filtered = filtered.filter((t) =>
        (t.category_name || "").toLowerCase().includes(lowerCategory)
      );
    }
    if (payee) {
      const lowerPayee = payee.toLowerCase();
      filtered = filtered.filter((t) =>
        (t.payee_name || "").toLowerCase().includes(lowerPayee)
      );
    }
    if (limit && filtered.length > limit) {
      filtered = filtered.slice(0, limit);
    }

    // Map transactions for output
    const mapped = new GetTransactionsMapper().map(filtered);

    // Build filter description
    const filterDescription = [
      startDate || endDate ? `Date range: ${startDate} to ${endDate}` : null,
      minAmount !== undefined ? `Min amount: $${minAmount.toFixed(2)}` : null,
      maxAmount !== undefined ? `Max amount: $${maxAmount.toFixed(2)}` : null,
      category ? `Category: ${category}` : null,
      payee ? `Payee: ${payee}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const markdown = new GetTransactionsReportGenerator().generate(
      mapped,
      filterDescription,
      filtered.length,
      transactions.length
    );
    return success(markdown);
  } catch (err) {
    return errorFromCatch(err);
  }
}
