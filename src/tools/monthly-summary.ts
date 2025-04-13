import { initActualApi } from "../actual-api.js";
import api from "@actual-app/api";
import { formatAmount, formatDate } from "../utils.js";
import {
  MonthlySummaryArgs,
  Transaction,
  Account,
  Category,
  MonthData,
  CategoryGroup,
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
  const categoryGroups: CategoryGroup[] = await api.getCategoryGroups();

  // Create a map of income categories
  const incomeCategories: Set<string> = new Set();
  categories.forEach((cat) => {
    if (cat.is_income) {
      incomeCategories.add(cat.id);
    }
  });

  // Identify investment and savings categories
  const investmentSavingsCategories: Set<string> = new Set();
  const categoryToGroup: Record<string, string> = {};

  categories.forEach((cat) => {
    const group = categoryGroups.find((g) => g.id === cat.group_id);
    const groupName = group?.name || "";
    categoryToGroup[cat.id] = groupName;

    // Check if this category belongs to an investment or savings group
    if (
      groupName.toLowerCase().includes("investment") ||
      groupName.toLowerCase().includes("savings") ||
      cat.name.toLowerCase().includes("vacation") ||
      cat.name.toLowerCase().includes("savings")
    ) {
      investmentSavingsCategories.add(cat.id);
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
        investments: 0,
        transactions: 0,
      };
    }

    // Determine the type of transaction
    const isIncome: boolean = transaction.category
      ? incomeCategories.has(transaction.category)
      : false;
    const isInvestmentOrSavings: boolean = transaction.category
      ? investmentSavingsCategories.has(transaction.category)
      : false;

    if (isIncome || transaction.amount > 0) {
      monthlyData[yearMonth].income += Math.abs(transaction.amount);
    } else if (isInvestmentOrSavings) {
      // Track investments/savings separately
      monthlyData[yearMonth].investments += Math.abs(transaction.amount);
    } else {
      // Regular expenses (consumption)
      monthlyData[yearMonth].expenses += Math.abs(transaction.amount);
    }

    monthlyData[yearMonth].transactions += 1;
  });

  // Convert to array and sort by date
  const sortedMonths: MonthData[] = Object.values(monthlyData).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  // Calculate averages
  const totalIncome: number = sortedMonths.reduce(
    (sum, month) => sum + month.income,
    0
  );
  const totalExpenses: number = sortedMonths.reduce(
    (sum, month) => sum + month.expenses,
    0
  );
  const totalInvestments: number = sortedMonths.reduce(
    (sum, month) => sum + month.investments,
    0
  );
  const monthCount: number = sortedMonths.length;

  const avgIncome: number = monthCount > 0 ? totalIncome / monthCount : 0;
  const avgExpenses: number = monthCount > 0 ? totalExpenses / monthCount : 0;
  const avgInvestments: number =
    monthCount > 0 ? totalInvestments / monthCount : 0;

  // Traditional savings (income - expenses)
  const avgTraditionalSavings: number = avgIncome - avgExpenses;
  // Total savings (traditional savings + investments)
  const avgTotalSavings: number = avgTraditionalSavings + avgInvestments;
  // Traditional savings rate
  const avgTraditionalSavingsRate: number =
    avgIncome > 0 ? (avgTraditionalSavings / avgIncome) * 100 : 0;
  // Total savings rate (including investments)
  const avgTotalSavingsRate: number =
    avgIncome > 0
      ? ((avgTraditionalSavings + avgInvestments) / avgIncome) * 100
      : 0;

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
  markdown += `| Month | Income | Regular Expenses | Investments | Traditional Savings | Total Savings | Total Savings Rate |\n`;
  markdown += `| ----- | ------ | ---------------- | ----------- | ------------------- | ------------- | ------------------ |\n`;

  sortedMonths.forEach((month) => {
    const monthName: string = new Date(
      month.year,
      month.month - 1,
      1
    ).toLocaleString("default", { month: "long" });
    const income: string = formatAmount(month.income);
    const expenses: string = formatAmount(month.expenses);
    const investments: string = formatAmount(month.investments);

    const traditionalSavings: number = month.income - month.expenses;
    const totalSavings: number = traditionalSavings + month.investments;

    const savingsFormatted: string = formatAmount(traditionalSavings);
    const totalSavingsFormatted: string = formatAmount(totalSavings);

    const savingsRate: string =
      month.income > 0
        ? ((totalSavings / month.income) * 100).toFixed(1) + "%"
        : "N/A";

    markdown += `| ${monthName} ${month.year} | ${income} | ${expenses} | ${investments} | ${savingsFormatted} | ${totalSavingsFormatted} | ${savingsRate} |\n`;
  });

  // Add averages
  markdown += `\n## Averages\n\n`;
  markdown += `Average Monthly Income: ${formatAmount(avgIncome)}\n`;
  markdown += `Average Monthly Regular Expenses: ${formatAmount(
    avgExpenses
  )}\n`;
  markdown += `Average Monthly Investments: ${formatAmount(avgInvestments)}\n`;
  markdown += `Average Monthly Traditional Savings: ${formatAmount(
    avgTraditionalSavings
  )}\n`;
  markdown += `Average Monthly Total Savings: ${formatAmount(
    avgTotalSavings
  )}\n`;
  markdown += `Average Traditional Savings Rate: ${avgTraditionalSavingsRate.toFixed(
    1
  )}%\n`;
  markdown += `Average Total Savings Rate: ${avgTotalSavingsRate.toFixed(
    1
  )}%\n`;

  markdown += `\n## Definitions\n\n`;
  markdown += `* **Traditional Savings**: Income minus regular expenses (excluding investments)\n`;
  markdown += `* **Total Savings**: Traditional savings plus investments\n`;
  markdown += `* **Total Savings Rate**: Percentage of income that goes to savings and investments\n`;

  return {
    content: [{ type: "text", text: markdown }],
  };
};
