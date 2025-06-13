// ----------------------------
// RESOURCES
// ----------------------------

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import api from "@actual-app/api";

// Import types from types.ts
import { Account, Transaction } from "./types.js";
import { formatAmount, formatDate, getDateRange } from "./utils.js";
import { initActualApi, shutdownActualApi } from "./actual-api.js";
import { fetchAllAccounts } from "./core/data/fetch-accounts.js";

export const setupResources = (server: Server) => {
  /**
   * Handler for listing available resources (accounts)
   */
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      await initActualApi();
      const accounts: Account[] = await fetchAllAccounts();
      return {
        resources: accounts.map((account) => ({
          uri: `actual://accounts/${account.id}`,
          name: account.name,
          description: `${account.name} (${account.type || "Account"})${
            account.closed ? " - CLOSED" : ""
          }`,
          mimeType: "text/markdown",
        })),
      };
    } catch (error) {
      console.error("Error listing resources:", error);
      throw error;
    } finally {
      await shutdownActualApi();
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
      const pathParts: string[] = url.pathname.split("/").filter(Boolean);

      // If the path is just "accounts", return list of all accounts
      if (pathParts.length === 0 && url.hostname === "accounts") {
        const accounts: Account[] = await api.getAccounts();

        const accountsText: string = accounts
          .map((account) => {
            const closed = account.closed ? " (CLOSED)" : "";
            const offBudget = account.offbudget ? " (OFF BUDGET)" : "";
            const balance =
              account.balance !== undefined
                ? ` - ${formatAmount(account.balance)}`
                : "";

            return `- ${account.name}${closed}${offBudget}${balance} [ID: ${account.id}]`;
          })
          .join("\n");

        return {
          contents: [
            {
              uri: uri,
              text: `# Actual Budget Accounts\n\n${accountsText}\n\nTotal Accounts: ${accounts.length}`,
              mimeType: "text/markdown",
            },
          ],
        };
      }

      // If the path is "accounts/{id}", return account details
      if (pathParts.length === 1 && url.hostname === "accounts") {
        const accountId: string = pathParts[0];
        const accounts: Account[] = await api.getAccounts();
        const account: Account | undefined = accounts.find(
          (a) => a.id === accountId
        );

        if (!account) {
          return {
            contents: [
              {
                uri: uri,
                text: `Error: Account with ID ${accountId} not found`,
                mimeType: "text/plain",
              },
            ],
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
          contents: [
            {
              uri: uri,
              text: details,
              mimeType: "text/markdown",
            },
          ],
        };
      }

      // If the path is "accounts/{id}/transactions", return transactions
      if (
        pathParts.length === 2 &&
        pathParts[1] === "transactions" &&
        url.hostname === "accounts"
      ) {
        const accountId: string = pathParts[0];
        const { startDate, endDate } = getDateRange();
        const transactions: Transaction[] = await api.getTransactions(
          accountId,
          startDate,
          endDate
        );

        if (!transactions || transactions.length === 0) {
          return {
            contents: [
              {
                uri: uri,
                text: `No transactions found for account ID ${accountId} between ${startDate} and ${endDate}`,
                mimeType: "text/plain",
              },
            ],
          };
        }

        // Create a markdown table of transactions
        const header: string =
          "| Date | Payee | Category | Amount | Notes |\n| ---- | ----- | -------- | ------ | ----- |\n";
        const rows: string = transactions
          .map((t) => {
            const amount: string = formatAmount(t.amount);
            const date: string = formatDate(t.date);
            const payee: string = t.payee_name || "(No payee)";
            const category: string = t.category_name || "(Uncategorized)";
            const notes: string = t.notes || "";

            return `| ${date} | ${payee} | ${category} | ${amount} | ${notes} |`;
          })
          .join("\n");

        const text: string = `# Transactions for Account\n\nTime period: ${startDate} to ${endDate}\nTotal Transactions: ${transactions.length}\n\n${header}${rows}`;

        return {
          contents: [
            {
              uri: uri,
              text: text,
              mimeType: "text/markdown",
            },
          ],
        };
      }

      // If we don't recognize the URI pattern, return an error
      return {
        contents: [
          {
            uri: uri,
            text: `Error: Unrecognized resource URI: ${uri}`,
            mimeType: "text/plain",
          },
        ],
      };
    } catch (error) {
      console.error("Error reading resource:", error);
      throw error;
    }
  });
};
