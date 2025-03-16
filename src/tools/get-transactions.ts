import { initActualApi } from "../actual-api.js";
import api from "@actual-app/api";
import { formatAmount, formatDate } from "../utils.js";
import { getDateRange } from "../utils.js";
import { GetTransactionsArgs, Transaction } from "../types.js";

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

export const handler = async (args: GetTransactionsArgs) => {
  const {
    accountId,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    category,
    payee,
    limit,
  } = args;
  await initActualApi();

  if (!accountId) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: accountId is required" }],
    };
  }

  const { startDate: start, endDate: end } = getDateRange(startDate, endDate);
  const transactions: Transaction[] = await api.getTransactions(
    accountId,
    start,
    end
  );

  // Apply filters
  let filtered: Transaction[] = [...transactions];

  if (minAmount !== undefined) {
    filtered = filtered.filter((t) => t.amount >= minAmount * 100); // Convert to cents
  }

  if (maxAmount !== undefined) {
    filtered = filtered.filter((t) => t.amount <= maxAmount * 100); // Convert to cents
  }

  if (category) {
    const lowerCategory: string = category.toLowerCase();
    filtered = filtered.filter((t) =>
      (t.category_name || "").toLowerCase().includes(lowerCategory)
    );
  }

  if (payee) {
    const lowerPayee: string = payee.toLowerCase();
    filtered = filtered.filter((t) =>
      (t.payee_name || "").toLowerCase().includes(lowerPayee)
    );
  }

  // Apply limit
  if (limit && filtered.length > limit) {
    filtered = filtered.slice(0, limit);
  }

  // Create a markdown table of filtered transactions
  const header: string =
    "| Date | Payee | Category | Amount | Notes |\n| ---- | ----- | -------- | ------ | ----- |\n";
  const rows: string = filtered
    .map((t) => {
      const amount: string = formatAmount(t.amount);
      const date: string = formatDate(t.date);
      const payeeName: string = t.payee_name || "(No payee)";
      const categoryName: string = t.category_name || "(Uncategorized)";
      const notes: string = t.notes || "";

      return `| ${date} | ${payeeName} | ${categoryName} | ${amount} | ${notes} |`;
    })
    .join("\n");

  const filterDescription: string = [
    startDate || endDate ? `Date range: ${start} to ${end}` : null,
    minAmount !== undefined
      ? `Min amount: ${formatAmount(minAmount * 100)}`
      : null,
    maxAmount !== undefined
      ? `Max amount: ${formatAmount(maxAmount * 100)}`
      : null,
    category ? `Category: ${category}` : null,
    payee ? `Payee: ${payee}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const text: string = `# Filtered Transactions\n\n${filterDescription}\nMatching Transactions: ${filtered.length}/${transactions.length}\n\n${header}${rows}`;

  return {
    content: [{ type: "text", text: text }],
  };
};
