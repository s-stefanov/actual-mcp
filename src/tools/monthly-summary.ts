import { initActualApi } from "../actual-api.js";
import api from "@actual-app/api";
import { formatAmount, formatDate } from "../utils.js";
import {
  MonthlySummaryArgs,
  Transaction,
  Account,
  Category,
  MonthData
} from "../types.js";

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

export const handler = async (args: MonthlySummaryArgs) => {
  await initActualApi();
  
  const { months = 3, accountId } = args;

  // Generate date range for the specified number of months
  const endDate: Date = new Date();
  const startDate: Date = new Date();
  startDate.setMonth(endDate.getMonth() - (months - 1));
  startDate.setDate(1); // First day of the month

  const start: string = formatDate(startDate);
  const end: string = formatDate(endDate);

  const accounts: Account[] = await api.getAccounts();

  // Get all categories
  const categories: Category[] = await api.getCategories();

  // Create a map of income categories
  const incomeCategories: Set<string> = new Set();
  categories.forEach((cat) => {
    if (cat.is_income) {
      incomeCategories.add(cat.id);
    }
  });

  // Process all transactions
  let allTransactions: Transaction[] = [];

  if (accountId) {
    // Only get transactions for the specified account
    allTransactions = await api.getTransactions(accountId, start, end);
  } else {
    // Get transactions for all on-budget accounts
    const onBudgetAccounts: Account[] = accounts.filter(
      (a) => !a.offbudget && !a.closed
    );

    for (const account of onBudgetAccounts) {
      const transactions: Transaction[] = await api.getTransactions(
        account.id,
        start,
        end
      );
      allTransactions = [...allTransactions, ...transactions];
    }
  }

  // Group transactions by month
  const monthlyData: Record<string, MonthData> = {};

  allTransactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const yearMonth = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    if (!monthlyData[yearMonth]) {
      monthlyData[yearMonth] = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        income: 0,
        expenses: 0,
        transactions: 0,
      };
    }

    // Determine if this is income or expense
    const isIncome: boolean = transaction.category
      ? incomeCategories.has(transaction.category)
      : false;

    if (isIncome || transaction.amount > 0) {
      monthlyData[yearMonth].income += Math.abs(transaction.amount);
    } else {
      monthlyData[yearMonth].expenses += Math.abs(transaction.amount);
    }

    monthlyData[yearMonth].transactions += 1;
  });

  // Convert to array and sort by date
  const sortedMonths: MonthData[] = Object.values(monthlyData).sort(
    (a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    }
  );

  // Calculate averages
  const totalIncome: number = sortedMonths.reduce(
    (sum, month) => sum + month.income,
    0
  );
  const totalExpenses: number = sortedMonths.reduce(
    (sum, month) => sum + month.expenses,
    0
  );
  const monthCount: number = sortedMonths.length;

  const avgIncome: number =
    monthCount > 0 ? totalIncome / monthCount : 0;
  const avgExpenses: number =
    monthCount > 0 ? totalExpenses / monthCount : 0;
  const avgSavings: number = avgIncome - avgExpenses;
  const avgSavingsRate: number =
    avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0;

  // Generate markdown report
  let markdown: string = `# Monthly Financial Summary\n\n`;
  markdown += `Period: ${start} to ${end}\n\n`;

  if (accountId) {
    const account: Account | undefined = accounts.find(
      (a) => a.id === accountId
    );
    markdown += `Account: ${account ? account.name : accountId}\n\n`;
  } else {
    markdown += `Accounts: All on-budget accounts\n\n`;
  }

  // Add summary table
  markdown += `## Monthly Breakdown\n\n`;
  markdown += `| Month | Income | Expenses | Savings | Savings Rate |\n`;
  markdown += `| ----- | ------ | -------- | ------- | ------------ |\n`;

  sortedMonths.forEach((month) => {
    const monthName: string = new Date(
      month.year,
      month.month - 1,
      1
    ).toLocaleString("default", { month: "long" });
    const income: string = formatAmount(month.income);
    const expenses: string = formatAmount(month.expenses);
    const savings: string = formatAmount(month.income - month.expenses);
    const savingsRate: string =
      month.income > 0
        ? (
            ((month.income - month.expenses) / month.income) *
            100
          ).toFixed(1) + "%"
        : "N/A";

    markdown += `| ${monthName} ${month.year} | ${income} | ${expenses} | ${savings} | ${savingsRate} |\n`;
  });

  // Add averages
  markdown += `\n## Averages\n\n`;
  markdown += `Average Monthly Income: ${formatAmount(avgIncome)}\n`;
  markdown += `Average Monthly Expenses: ${formatAmount(
    avgExpenses
  )}\n`;
  markdown += `Average Monthly Savings: ${formatAmount(avgSavings)}\n`;
  markdown += `Average Savings Rate: ${avgSavingsRate.toFixed(1)}%\n`;

  return {
    content: [{ type: "text", text: markdown }],
  };
};
