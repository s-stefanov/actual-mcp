import { initActualApi } from "../actual-api.js";
import api from "@actual-app/api";
import { formatAmount } from "../utils.js";
import { getDateRange } from "../utils.js";
import { 
  SpendingByCategoryArgs, 
  Transaction, 
  Account, 
  Category, 
  CategoryGroup, 
  GroupSpending, 
  CategorySpending,
  CategoryGroupInfo 
} from "../types.js";

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
        description: "Optional ID of a specific account to analyze. If not provided, all on-budget accounts will be used.",
      },
      includeIncome: {
        type: "boolean",
        description: "Whether to include income categories in the report (default: false)",
      },
    },
  },
};

export const handler = async (args: SpendingByCategoryArgs) => {
  await initActualApi();
  
  const {
    startDate,
    endDate,
    accountId,
    includeIncome = false,
  } = args;

  const { startDate: start, endDate: end } = getDateRange(
    startDate,
    endDate
  );
  const accounts: Account[] = await api.getAccounts();

  // Get all categories
  const categories: Category[] = await api.getCategories();
  const categoryGroups: CategoryGroup[] = await api.getCategoryGroups();

  // Create a map of category ID to name
  const categoryNames: Record<string, string> = {};
  categories.forEach((cat) => {
    categoryNames[cat.id] = cat.name;
  });

  // Create a map of category group ID to name
  const groupNames: Record<string, string> = {};
  categoryGroups.forEach((group) => {
    groupNames[group.id] = group.name;
  });

  // Find category group for each category
  const categoryToGroup: Record<string, CategoryGroupInfo> = {};
  categories.forEach((cat) => {
    categoryToGroup[cat.id] = {
      id: cat.group_id,
      name: groupNames[cat.group_id] || "Unknown Group",
      isIncome: !!cat.is_income,
    };
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

  // Group transactions by category
  const spendingByCategory: Record<string, CategorySpending> = {};

  allTransactions.forEach((transaction) => {
    if (!transaction.category) return; // Skip uncategorized

    const categoryId: string = transaction.category;
    const categoryName: string =
      categoryNames[categoryId] || "Unknown Category";
    const group:
      | CategoryGroupInfo
      | { name: string; isIncome: boolean } = categoryToGroup[
      categoryId
    ] || { name: "Unknown Group", isIncome: false };

    // Skip income categories if not requested
    if (group.isIncome && !includeIncome) return;

    if (!spendingByCategory[categoryId]) {
      spendingByCategory[categoryId] = {
        name: categoryName,
        group: group.name,
        isIncome: group.isIncome,
        total: 0,
        transactions: 0,
      };
    }

    spendingByCategory[categoryId].total += transaction.amount;
    spendingByCategory[categoryId].transactions += 1;
  });

  // Sort categories by absolute total (descending)
  const sortedCategories: CategorySpending[] = Object.values(
    spendingByCategory
  ).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  // Group by category group
  const spendingByGroup: Record<string, GroupSpending> = {};
  sortedCategories.forEach((category) => {
    if (!spendingByGroup[category.group]) {
      spendingByGroup[category.group] = {
        name: category.group,
        total: 0,
        categories: [],
      };
    }

    spendingByGroup[category.group].total += category.total;
    spendingByGroup[category.group].categories.push(category);
  });

  // Sort groups by absolute total (descending)
  const sortedGroups: GroupSpending[] = Object.values(
    spendingByGroup
  ).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  // Generate markdown report
  let markdown: string = `# Spending by Category\n\n`;
  markdown += `Period: ${start} to ${end}\n\n`;

  if (accountId) {
    const account: Account | undefined = accounts.find(
      (a) => a.id === accountId
    );
    markdown += `Account: ${account ? account.name : accountId}\n\n`;
  } else {
    markdown += `Accounts: All on-budget accounts\n\n`;
  }

  markdown += `Income categories: ${
    includeIncome ? "Included" : "Excluded"
  }\n\n`;

  // Add summary for each group
  sortedGroups.forEach((group) => {
    markdown += `## ${group.name}\n`;
    markdown += `Total: ${formatAmount(group.total)}\n\n`;

    // Add table for categories in this group
    markdown += `| Category | Amount | Transactions |\n`;
    markdown += `| -------- | ------ | ------------ |\n`;

    group.categories.forEach((category) => {
      markdown += `| ${category.name} | ${formatAmount(
        category.total
      )} | ${category.transactions} |\n`;
    });

    markdown += `\n`;
  });

  return {
    content: [{ type: "text", text: markdown }],
  };
};