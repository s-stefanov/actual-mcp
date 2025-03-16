#!/usr/bin/env node
/**
 * MCP Server for Actual Budget
 * 
 * This server exposes your Actual Budget data to LLMs through the Model Context Protocol,
 * allowing for natural language interaction with your financial data.
 * 
 * Features:
 * - List and view accounts
 * - View transactions with filtering
 * - Generate financial statistics and analysis
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import api from "@actual-app/api";
import path from "path";

// Import types from types.ts
import {
  Account,
  Transaction,
  Category,
  CategoryGroup,
  BudgetFile,
  GetTransactionsArgs,
  SpendingByCategoryArgs,
  MonthlySummaryArgs,
  BalanceHistoryArgs,
  FinancialInsightsArgs,
  BudgetReviewArgs,
  CategoryGroupInfo,
  CategorySpending,
  GroupSpending,
  MonthData,
  MonthBalance
} from "./types.js";
import { formatDate, getDateRange } from "./utils.js";
import { setupPrompts } from "./prompts.js";

// Configuration
const DEFAULT_DATA_DIR: string = path.resolve(process.env.HOME || process.env.USERPROFILE || ".", ".actual");

// Initialize the MCP server
const server = new Server(
  {
    name: "Actual Budget",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// API initialization state
let initialized: boolean = false;
let initializing: boolean = false;
let initializationError: Error | null = null;

/**
 * Initialize the Actual Budget API
 */
async function initActualApi(): Promise<void> {
  if (initialized) return;
  if (initializing) {
    // Wait for initialization to complete if already in progress
    while (initializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (initializationError) throw initializationError;
    return;
  }

  try {
    initializing = true;
    console.error("Initializing Actual Budget API...");
    await api.init({
      dataDir: process.env.ACTUAL_DATA_DIR || DEFAULT_DATA_DIR,
      serverURL: process.env.ACTUAL_SERVER_URL,
      password: process.env.ACTUAL_PASSWORD,
    });

    const budgets: BudgetFile[] = await api.getBudgets();
    if (!budgets || budgets.length === 0) {
      throw new Error("No budgets found. Please create a budget in Actual first.");
    }

    // Use specified budget or the first one
    const budgetId: string = process.env.ACTUAL_BUDGET_SYNC_ID || budgets[0].cloudFileId || budgets[0].id || '';
    console.error(`Loading budget: ${budgetId}`);
    await api.downloadBudget(budgetId);
    
    initialized = true;
    console.error("Actual Budget API initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Actual Budget API:", error);
    initializationError = error instanceof Error ? error : new Error(String(error));
    throw initializationError;
  } finally {
    initializing = false;
  }
}

/**
 * Format currency amounts for display
 */
function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "N/A";
  
  // Convert from cents to dollars
  const dollars = amount / 100;
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(dollars);
}



// ----------------------------
// RESOURCES
// ----------------------------

/**
 * Handler for listing available resources (accounts)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    await initActualApi();
    const accounts: Account[] = await api.getAccounts();
    return {
      resources: accounts.map(account => ({
        uri: `actual://accounts/${account.id}`,
        name: account.name,
        description: `${account.name} (${account.type || "Account"})${account.closed ? " - CLOSED" : ""}`,
        mimeType: "text/markdown"
      }))
    };
  } catch (error) {
    console.error("Error listing resources:", error);
    throw error;
  }
});

/**
 * Handler for reading resources (account details and transactions)
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    await initActualApi();
    const uri: string = request.params.uri;
    const url = new URL(uri);
    
    // Parse the path to determine what to return
    const pathParts: string[] = url.pathname.split('/').filter(Boolean);
    
    // If the path is just "accounts", return list of all accounts
    if (pathParts.length === 0 && url.hostname === "accounts") {
      const accounts: Account[] = await api.getAccounts();
      
      const accountsText: string = accounts.map(account => {
        const closed = account.closed ? " (CLOSED)" : "";
        const offBudget = account.offbudget ? " (OFF BUDGET)" : "";
        const balance = account.balance !== undefined ? ` - ${formatAmount(account.balance)}` : "";
        
        return `- ${account.name}${closed}${offBudget}${balance} [ID: ${account.id}]`;
      }).join("\n");
      
      return {
        contents: [{
          uri: uri,
          text: `# Actual Budget Accounts\n\n${accountsText}\n\nTotal Accounts: ${accounts.length}`,
          mimeType: "text/markdown"
        }]
      };
    }
    
    // If the path is "accounts/{id}", return account details
    if (pathParts.length === 1 && url.hostname === "accounts") {
      const accountId: string = pathParts[0];
      const accounts: Account[] = await api.getAccounts();
      const account: Account | undefined = accounts.find(a => a.id === accountId);
      
      if (!account) {
        return {
          contents: [{
            uri: uri,
            text: `Error: Account with ID ${accountId} not found`,
            mimeType: "text/plain"
          }]
        };
      }
      
      const balance: number = await api.getAccountBalance(accountId);
      const formattedBalance: string = formatAmount(balance);
      
      const details: string = `# Account: ${account.name}

ID: ${account.id}
Type: ${account.type || "Unknown"}
Balance: ${formattedBalance}
On Budget: ${!account.offbudget}
Status: ${account.closed ? "Closed" : "Open"}

To view transactions for this account, use the get-transactions tool.`;

      return {
        contents: [{
          uri: uri,
          text: details,
          mimeType: "text/markdown"
        }]
      };
    }
    
    // If the path is "accounts/{id}/transactions", return transactions
    if (pathParts.length === 2 && pathParts[1] === "transactions" && url.hostname === "accounts") {
      const accountId: string = pathParts[0];
      const { startDate, endDate } = getDateRange();
      const transactions: Transaction[] = await api.getTransactions(accountId, startDate, endDate);
      
      if (!transactions || transactions.length === 0) {
        return {
          contents: [{
            uri: uri,
            text: `No transactions found for account ID ${accountId} between ${startDate} and ${endDate}`,
            mimeType: "text/plain"
          }]
        };
      }
      
      // Create a markdown table of transactions
      const header: string = "| Date | Payee | Category | Amount | Notes |\n| ---- | ----- | -------- | ------ | ----- |\n";
      const rows: string = transactions.map(t => {
        const amount: string = formatAmount(t.amount);
        const date: string = formatDate(t.date);
        const payee: string = t.payee_name || "(No payee)";
        const category: string = t.category_name || "(Uncategorized)";
        const notes: string = t.notes || "";
        
        return `| ${date} | ${payee} | ${category} | ${amount} | ${notes} |`;
      }).join("\n");
      
      const text: string = `# Transactions for Account\n\nTime period: ${startDate} to ${endDate}\nTotal Transactions: ${transactions.length}\n\n${header}${rows}`;
      
      return {
        contents: [{
          uri: uri,
          text: text,
          mimeType: "text/markdown"
        }]
      };
    }
    
    // If we don't recognize the URI pattern, return an error
    return {
      contents: [{
        uri: uri,
        text: `Error: Unrecognized resource URI: ${uri}`,
        mimeType: "text/plain"
      }]
    };
  } catch (error) {
    console.error("Error reading resource:", error);
    throw error;
  }
});

// ----------------------------
// TOOLS
// ----------------------------

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get-transactions",
        description: "Get transactions for an account with optional filtering",
        inputSchema: {
          type: "object",
          properties: {
            accountId: {
              type: "string",
              description: "ID of the account to get transactions for"
            },
            startDate: {
              type: "string",
              description: "Start date in YYYY-MM-DD format"
            },
            endDate: {
              type: "string",
              description: "End date in YYYY-MM-DD format"
            },
            minAmount: {
              type: "number",
              description: "Minimum transaction amount in dollars"
            },
            maxAmount: {
              type: "number",
              description: "Maximum transaction amount in dollars"
            },
            category: {
              type: "string",
              description: "Filter by category name"
            },
            payee: {
              type: "string",
              description: "Filter by payee name"
            },
            limit: {
              type: "number",
              description: "Maximum number of transactions to return"
            }
          },
          required: ["accountId"]
        }
      },
      {
        name: "spending-by-category",
        description: "Get spending breakdown by category",
        inputSchema: {
          type: "object",
          properties: {
            startDate: {
              type: "string",
              description: "Start date in YYYY-MM-DD format"
            },
            endDate: {
              type: "string",
              description: "End date in YYYY-MM-DD format"
            },
            accountId: {
              type: "string",
              description: "Limit to a specific account ID"
            },
            includeIncome: {
              type: "boolean",
              description: "Include income categories",
              default: false
            }
          }
        }
      },
      {
        name: "monthly-summary",
        description: "Get monthly income, expenses, and savings",
        inputSchema: {
          type: "object",
          properties: {
            months: {
              type: "number",
              description: "Number of months to include",
              default: 3
            },
            accountId: {
              type: "string",
              description: "Limit to a specific account ID"
            }
          }
        }
      },
      {
        name: "balance-history",
        description: "Get account balance history over time",
        inputSchema: {
          type: "object",
          properties: {
            accountId: {
              type: "string",
              description: "ID of the account to get balance history for"
            },
            months: {
              type: "number",
              description: "Number of months to include",
              default: 12
            }
          },
          required: ["accountId"]
        }
      }
    ]
  };
});

/**
 * Handler for calling tools
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    await initActualApi();
    const { name, arguments: args } = request.params;
    
    // Execute the requested tool
    switch (name) {
      case "get-transactions": {
        //TODO: Fix with proper args
        const typedArgs = args as unknown as GetTransactionsArgs;
        const { accountId, startDate, endDate, minAmount, maxAmount, category, payee, limit } = typedArgs;
        
        if (!accountId) {
          return {
            isError: true,
            content: [{ type: "text", text: "Error: accountId is required" }]
          };
        }
        
        const { startDate: start, endDate: end } = getDateRange(startDate, endDate);
        const transactions: Transaction[] = await api.getTransactions(accountId, start, end);
        
        // Apply filters
        let filtered: Transaction[] = [...transactions];
        
        if (minAmount !== undefined) {
          filtered = filtered.filter(t => t.amount >= minAmount * 100); // Convert to cents
        }
        
        if (maxAmount !== undefined) {
          filtered = filtered.filter(t => t.amount <= maxAmount * 100); // Convert to cents
        }
        
        if (category) {
          const lowerCategory: string = category.toLowerCase();
          filtered = filtered.filter(t => 
            (t.category_name || "").toLowerCase().includes(lowerCategory)
          );
        }
        
        if (payee) {
          const lowerPayee: string = payee.toLowerCase();
          filtered = filtered.filter(t => 
            (t.payee_name || "").toLowerCase().includes(lowerPayee)
          );
        }
        
        // Apply limit
        if (limit && filtered.length > limit) {
          filtered = filtered.slice(0, limit);
        }
        
        // Create a markdown table of filtered transactions
        const header: string = "| Date | Payee | Category | Amount | Notes |\n| ---- | ----- | -------- | ------ | ----- |\n";
        const rows: string = filtered.map(t => {
          const amount: string = formatAmount(t.amount);
          const date: string = formatDate(t.date);
          const payeeName: string = t.payee_name || "(No payee)";
          const categoryName: string = t.category_name || "(Uncategorized)";
          const notes: string = t.notes || "";
          
          return `| ${date} | ${payeeName} | ${categoryName} | ${amount} | ${notes} |`;
        }).join("\n");
        
        const filterDescription: string = [
          startDate || endDate ? `Date range: ${start} to ${end}` : null,
          minAmount !== undefined ? `Min amount: ${formatAmount(minAmount * 100)}` : null,
          maxAmount !== undefined ? `Max amount: ${formatAmount(maxAmount * 100)}` : null,
          category ? `Category: ${category}` : null,
          payee ? `Payee: ${payee}` : null,
        ].filter(Boolean).join(", ");
        
        const text: string = `# Filtered Transactions\n\n${filterDescription}\nMatching Transactions: ${filtered.length}/${transactions.length}\n\n${header}${rows}`;
        
        return {
          content: [{ type: "text", text: text }]
        };
      }
      
      case "spending-by-category": {
        const typedArgs = args as SpendingByCategoryArgs;
        const { startDate, endDate, accountId, includeIncome = false } = typedArgs;
        
        const { startDate: start, endDate: end } = getDateRange(startDate, endDate);
        const accounts: Account[] = await api.getAccounts();
        
        // Get all categories
        const categories: Category[] = await api.getCategories();
        const categoryGroups: CategoryGroup[] = await api.getCategoryGroups();
        
        // Create a map of category ID to name
        const categoryNames: Record<string, string> = {};
        categories.forEach(cat => {
          categoryNames[cat.id] = cat.name;
        });
        
        // Create a map of category group ID to name
        const groupNames: Record<string, string> = {};
        categoryGroups.forEach(group => {
          groupNames[group.id] = group.name;
        });
        
        // Find category group for each category
        const categoryToGroup: Record<string, CategoryGroupInfo> = {};
        categories.forEach(cat => {
          categoryToGroup[cat.id] = {
            id: cat.group_id,
            name: groupNames[cat.group_id] || "Unknown Group",
            isIncome: !!cat.is_income
          };
        });
        
        // Process all transactions
        let allTransactions: Transaction[] = [];
        
        if (accountId) {
          // Only get transactions for the specified account
          allTransactions = await api.getTransactions(accountId, start, end);
        } else {
          // Get transactions for all on-budget accounts
          const onBudgetAccounts: Account[] = accounts.filter(a => !a.offbudget && !a.closed);
          
          for (const account of onBudgetAccounts) {
            const transactions: Transaction[] = await api.getTransactions(account.id, start, end);
            allTransactions = [...allTransactions, ...transactions];
          }
        }
        
        // Group transactions by category
        const spendingByCategory: Record<string, CategorySpending> = {};
        
        allTransactions.forEach(transaction => {
          if (!transaction.category) return; // Skip uncategorized
          
          const categoryId: string = transaction.category;
          const categoryName: string = categoryNames[categoryId] || "Unknown Category";
          const group: CategoryGroupInfo | { name: string, isIncome: boolean } = 
            categoryToGroup[categoryId] || { name: "Unknown Group", isIncome: false };
          
          // Skip income categories if not requested
          if (group.isIncome && !includeIncome) return;
          
          if (!spendingByCategory[categoryId]) {
            spendingByCategory[categoryId] = {
              name: categoryName,
              group: group.name,
              isIncome: group.isIncome,
              total: 0,
              transactions: 0
            };
          }
          
          spendingByCategory[categoryId].total += transaction.amount;
          spendingByCategory[categoryId].transactions += 1;
        });
        
        // Sort categories by absolute total (descending)
        const sortedCategories: CategorySpending[] = Object.values(spendingByCategory).sort((a, b) => 
          Math.abs(b.total) - Math.abs(a.total)
        );
        
        // Group by category group
        const spendingByGroup: Record<string, GroupSpending> = {};
        sortedCategories.forEach(category => {
          if (!spendingByGroup[category.group]) {
            spendingByGroup[category.group] = {
              name: category.group,
              total: 0,
              categories: []
            };
          }
          
          spendingByGroup[category.group].total += category.total;
          spendingByGroup[category.group].categories.push(category);
        });
        
        // Sort groups by absolute total (descending)
        const sortedGroups: GroupSpending[] = Object.values(spendingByGroup).sort((a, b) => 
          Math.abs(b.total) - Math.abs(a.total)
        );
        
        // Generate markdown report
        let markdown: string = `# Spending by Category\n\n`;
        markdown += `Period: ${start} to ${end}\n\n`;
        
        if (accountId) {
          const account: Account | undefined = accounts.find(a => a.id === accountId);
          markdown += `Account: ${account ? account.name : accountId}\n\n`;
        } else {
          markdown += `Accounts: All on-budget accounts\n\n`;
        }
        
        markdown += `Income categories: ${includeIncome ? "Included" : "Excluded"}\n\n`;
        
        // Add summary for each group
        sortedGroups.forEach(group => {
          markdown += `## ${group.name}\n`;
          markdown += `Total: ${formatAmount(group.total)}\n\n`;
          
          // Add table for categories in this group
          markdown += `| Category | Amount | Transactions |\n`;
          markdown += `| -------- | ------ | ------------ |\n`;
          
          group.categories.forEach(category => {
            markdown += `| ${category.name} | ${formatAmount(category.total)} | ${category.transactions} |\n`;
          });
          
          markdown += `\n`;
        });
        
        return {
          content: [{ type: "text", text: markdown }]
        };
      }
      
      case "monthly-summary": {
        const typedArgs = args as MonthlySummaryArgs;
        const { months = 3, accountId } = typedArgs;
        
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
        categories.forEach(cat => {
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
          const onBudgetAccounts: Account[] = accounts.filter(a => !a.offbudget && !a.closed);
          
          for (const account of onBudgetAccounts) {
            const transactions: Transaction[] = await api.getTransactions(account.id, start, end);
            allTransactions = [...allTransactions, ...transactions];
          }
        }
        
        // Group transactions by month
        const monthlyData: Record<string, MonthData> = {};
        
        allTransactions.forEach(transaction => {
          const date = new Date(transaction.date);
          const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData[yearMonth]) {
            monthlyData[yearMonth] = {
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              income: 0,
              expenses: 0,
              transactions: 0
            };
          }
          
          // Determine if this is income or expense
          const isIncome: boolean = transaction.category ? incomeCategories.has(transaction.category) : false;
          
          if (isIncome || transaction.amount > 0) {
            monthlyData[yearMonth].income += Math.abs(transaction.amount);
          } else {
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
        const totalIncome: number = sortedMonths.reduce((sum, month) => sum + month.income, 0);
        const totalExpenses: number = sortedMonths.reduce((sum, month) => sum + month.expenses, 0);
        const monthCount: number = sortedMonths.length;
        
        const avgIncome: number = monthCount > 0 ? totalIncome / monthCount : 0;
        const avgExpenses: number = monthCount > 0 ? totalExpenses / monthCount : 0;
        const avgSavings: number = avgIncome - avgExpenses;
        const avgSavingsRate: number = avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0;
        
        // Generate markdown report
        let markdown: string = `# Monthly Financial Summary\n\n`;
        markdown += `Period: ${start} to ${end}\n\n`;
        
        if (accountId) {
          const account: Account | undefined = accounts.find(a => a.id === accountId);
          markdown += `Account: ${account ? account.name : accountId}\n\n`;
        } else {
          markdown += `Accounts: All on-budget accounts\n\n`;
        }
        
        // Add summary table
        markdown += `## Monthly Breakdown\n\n`;
        markdown += `| Month | Income | Expenses | Savings | Savings Rate |\n`;
        markdown += `| ----- | ------ | -------- | ------- | ------------ |\n`;
        
        sortedMonths.forEach(month => {
          const monthName: string = new Date(month.year, month.month - 1, 1).toLocaleString('default', { month: 'long' });
          const income: string = formatAmount(month.income);
          const expenses: string = formatAmount(month.expenses);
          const savings: string = formatAmount(month.income - month.expenses);
          const savingsRate: string = month.income > 0 ? ((month.income - month.expenses) / month.income * 100).toFixed(1) + '%' : 'N/A';
          
          markdown += `| ${monthName} ${month.year} | ${income} | ${expenses} | ${savings} | ${savingsRate} |\n`;
        });
        
        // Add averages
        markdown += `\n## Averages\n\n`;
        markdown += `Average Monthly Income: ${formatAmount(avgIncome)}\n`;
        markdown += `Average Monthly Expenses: ${formatAmount(avgExpenses)}\n`;
        markdown += `Average Monthly Savings: ${formatAmount(avgSavings)}\n`;
        markdown += `Average Savings Rate: ${avgSavingsRate.toFixed(1)}%\n`;
        
        return {
          content: [{ type: "text", text: markdown }]
        };
      }
      
      case "balance-history": {
        //TODO: Fix with proper args
        const typedArgs = args as unknown as BalanceHistoryArgs;
        const { accountId, months = 12 } = typedArgs;
        
        if (!accountId) {
          return {
            isError: true,
            content: [{ type: "text", text: "Error: accountId is required" }]
          };
        }
        
        // Get account details
        const accounts: Account[] = await api.getAccounts();
        const account: Account | undefined = accounts.find(a => a.id === accountId);
        
        if (!account) {
          return {
            isError: true,
            content: [{ type: "text", text: `Error: Account with ID ${accountId} not found` }]
          };
        }
        
        // Generate date range for the specified number of months
        const endDate: Date = new Date();
        const startDate: Date = new Date();
        startDate.setMonth(endDate.getMonth() - months);
        
        const start: string = formatDate(startDate);
        const end: string = formatDate(endDate);
        
        // Get transactions for the account
        const transactions: Transaction[] = await api.getTransactions(accountId, start, end);
        
        // Get current balance
        const currentBalance: number = await api.getAccountBalance(accountId);
        
        // Calculate balance history by working backwards from current balance
        const balanceHistory: Record<string, MonthBalance> = {};
        let runningBalance: number = currentBalance;
        
        // Sort transactions by date (newest first)
        const sortedTransactions: Transaction[] = [...transactions].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        
        // Initialize with current balance for current month
        const currentDate: Date = new Date();
        const currentYearMonth: string = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
        balanceHistory[currentYearMonth] = {
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
          balance: runningBalance,
          transactions: 0
        };
        
        // Process transactions to calculate past balances
        sortedTransactions.forEach(transaction => {
          const date = new Date(transaction.date);
          const yearMonth: string = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          // Subtract transaction amount from running balance (going backwards in time)
          runningBalance -= transaction.amount;
          
          if (!balanceHistory[yearMonth]) {
            balanceHistory[yearMonth] = {
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              balance: runningBalance,
              transactions: 0
            };
          }
          
          balanceHistory[yearMonth].transactions += 1;
        });
        
        // Convert to array and sort by date
        const sortedMonths: MonthBalance[] = Object.values(balanceHistory).sort((a, b) => {
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
        
        sortedMonths.forEach(month => {
          const monthName: string = new Date(month.year, month.month - 1, 1).toLocaleString('default', { month: 'long' });
          const balance: string = formatAmount(month.balance);
          
          let change: string = "";
          let changeAmount: number = 0;
          
          if (previousBalance !== null) {
            changeAmount = month.balance - previousBalance;
            const changeFormatted: string = formatAmount(changeAmount);
            const direction: string = changeAmount > 0 ? "↑" : changeAmount < 0 ? "↓" : "";
            change = `${direction} ${changeFormatted}`;
          }
          
          previousBalance = month.balance;
          
          markdown += `| ${monthName} ${month.year} | ${balance} | ${change} | ${month.transactions} |\n`;
        });
        
        return {
          content: [{ type: "text", text: markdown }]
        };
      }
      
      default:
        return {
          isError: true,
          content: [{ type: "text", text: `Error: Unknown tool ${name}` }]
        };
    }
  } catch (error) {
    console.error(`Error executing tool ${request.params.name}:`, error);
    return {
      isError: true,
      content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
    };
  }
});

// ----------------------------
// PROMPTS
// ----------------------------

setupPrompts(server);

// ----------------------------
// SERVER STARTUP
// ----------------------------

// Start the server
async function main(): Promise<void> {
  // Validate environment variables
  if (!process.env.ACTUAL_DATA_DIR && !process.env.ACTUAL_SERVER_URL) {
    console.error("Warning: Neither ACTUAL_DATA_DIR nor ACTUAL_SERVER_URL is set.");
    console.error(`Will try to use default data directory: ${DEFAULT_DATA_DIR}`);
  }
  
  if (process.env.ACTUAL_SERVER_URL && !process.env.ACTUAL_PASSWORD) {
    console.error("Warning: ACTUAL_SERVER_URL is set but ACTUAL_PASSWORD is not.");
    console.error("If your server requires authentication, initialization will fail.");
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Actual Budget MCP Server started");
}

main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});

// Add this to your server file for direct testing
if (process.argv.includes("--test-resources")) {
  (async () => {
    try {
      await initActualApi();
      const accounts: Account[] = await api.getAccounts();
      await api.shutdown();
      console.log("Successfully retrieved accounts:", JSON.stringify(accounts, null, 2));
    } catch (error) {
      console.error("Error retrieving accounts:", error);
    }
    process.exit(0);
  })();
}