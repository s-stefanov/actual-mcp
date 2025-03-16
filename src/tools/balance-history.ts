import { initActualApi } from "../actual-api.js";
import api from "@actual-app/api";
import { formatAmount, formatDate } from "../utils.js";
import {
  BalanceHistoryArgs,
  Transaction,
  Account,
  MonthBalance
} from "../types.js";

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

export const handler = async (args: BalanceHistoryArgs) => {
  await initActualApi();
  
  const { accountId, months = 12 } = args;

  if (!accountId) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: accountId is required" }],
    };
  }

  // Get account details
  const accounts: Account[] = await api.getAccounts();
  const account: Account | undefined = accounts.find(
    (a) => a.id === accountId
  );

  if (!account) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error: Account with ID ${accountId} not found`,
        },
      ],
    };
  }

  // Generate date range for the specified number of months
  const endDate: Date = new Date();
  const startDate: Date = new Date();
  startDate.setMonth(endDate.getMonth() - months);

  const start: string = formatDate(startDate);
  const end: string = formatDate(endDate);

  // Get transactions for the account
  const transactions: Transaction[] = await api.getTransactions(
    accountId,
    start,
    end
  );

  // Get current balance
  const currentBalance: number = await api.getAccountBalance(accountId);

  // Calculate balance history by working backwards from current balance
  const balanceHistory: Record<string, MonthBalance> = {};
  let runningBalance: number = currentBalance;

  // Sort transactions by date (newest first)
  const sortedTransactions: Transaction[] = [...transactions].sort(
    (a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  );

  // Initialize with current balance for current month
  const currentDate: Date = new Date();
  const currentYearMonth: string = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}`;

  balanceHistory[currentYearMonth] = {
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    balance: runningBalance,
    transactions: 0,
  };

  // Process transactions to calculate past balances
  sortedTransactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const yearMonth: string = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    // Subtract transaction amount from running balance (going backwards in time)
    runningBalance -= transaction.amount;

    if (!balanceHistory[yearMonth]) {
      balanceHistory[yearMonth] = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        balance: runningBalance,
        transactions: 0,
      };
    }

    balanceHistory[yearMonth].transactions += 1;
  });

  // Convert to array and sort by date
  const sortedMonths: MonthBalance[] = Object.values(
    balanceHistory
  ).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  // Generate markdown report
  let markdown: string = `# Account Balance History\n\n`;
  markdown += `Account: ${account.name}\n`;
  markdown += `Period: ${start} to ${end}\n\n`;

  // Add balance history table
  markdown += `| Month | End of Month Balance | Monthly Change | Transactions |\n`;
  markdown += `| ----- | -------------------- | -------------- | ------------ |\n`;

  let previousBalance: number | null = null;

  sortedMonths.forEach((month) => {
    const monthName: string = new Date(
      month.year,
      month.month - 1,
      1
    ).toLocaleString("default", { month: "long" });
    const balance: string = formatAmount(month.balance);

    let change: string = "";
    let changeAmount: number = 0;

    if (previousBalance !== null) {
      changeAmount = month.balance - previousBalance;
      const changeFormatted: string = formatAmount(changeAmount);
      const direction: string =
        changeAmount > 0 ? "↑" : changeAmount < 0 ? "↓" : "";
      change = `${direction} ${changeFormatted}`;
    }

    previousBalance = month.balance;

    markdown += `| ${monthName} ${month.year} | ${balance} | ${change} | ${month.transactions} |\n`;
  });

  return {
    content: [{ type: "text", text: markdown }],
  };
};
