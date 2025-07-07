# Gemini Code Assist Rules

This document provides rules and guidelines for the Gemini Code Assist to follow when interacting with this project.

## Project Overview

This project is a TypeScript-based server that exposes the Actual Budget API through the Model Context Protocol (MCP). It allows users to interact with their financial data using natural language. The server follows a modular architecture:

- **Main server** (`src/index.ts`): MCP server initialization and transport setup.
- **MCP Integration**: Uses `@modelcontextprotocol/sdk` for server implementation.
- **Actual Budget API** (`src/actual-api.ts`): Manages the connection lifecycle to Actual Budget data.
- **Tools** (`src/tools/`): Each tool follows a consistent modular pattern:
  - `index.ts`: Schema definition and main handler.
  - `input-parser.ts`: Argument validation and parsing.
  - `data-fetcher.ts`: Data retrieval from Actual Budget.
  - `report-generator.ts`: Output formatting.
  - `types.ts`: Tool-specific type definitions.
- **Core Utilities** (`src/core/`): Shared functionality for data fetching, input handling, aggregation, and mapping.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript.
- **Watch**: `npm run watch` - Watches for changes and recompiles.
- **Test connection**: `node build/index.js --test-resources` - Verifies the connection to Actual Budget data.
- **Debug with MCP Inspector**: `npm run inspector` - Debugs MCP server communication.

## Environment Configuration

The following environment variables can be used for configuration:

- `ACTUAL_DATA_DIR`: Local Actual Budget data directory (default: `~/.actual`).
- `ACTUAL_SERVER_URL`: Remote Actual server URL (optional).
- `ACTUAL_PASSWORD`: Server authentication (required if using a remote server).
- `ACTUAL_BUDGET_SYNC_ID`: Specific budget ID (optional).

## Tool Usage

The following tools are available:

- `get-accounts`: Retrieve a list of all accounts with their current balance and ID. This tool should be used when the user asks for a list of accounts or wants to know their account IDs.
- `get-transactions`: Get transactions for an account with optional filtering. This tool should be used when the user wants to see their transactions. It requires an `accountId` and can be filtered by date, amount, category, and payee.
- `spending-by-category`: Get spending breakdown by category for a specified date range. This tool should be used when the user wants to analyze their spending by category. It can be filtered by date and account.
- `monthly-summary`: Get monthly income, expenses, and savings. This tool should be used when the user wants a summary of their monthly finances. It can be filtered by the number of months and account.
- `balance-history`: Get account balance history over time. This tool should be used when the user wants to see how their account balance has changed over time. It requires an `accountId` and can be filtered by the number of months.

## Style and Conventions

- **Automatic Learning:** Continuously learn from the existing codebase. When new files or code are added, analyze them to understand and adopt any new coding styles, patterns, or conventions.

## External Documentation

- **Up-to-date Libraries:** When you need to work with a library, especially when implementing new features or troubleshooting, use the `resolve_library_id` and `get_library_docs` tools to get the latest official documentation. This ensures that the code adheres to the most current best practices and API specifications. You must call `resolve_library_id` first to obtain the exact Context7-compatible library ID required to use `get_library_docs`, unless the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query.

## General Guidelines

- When the user asks a question about their finances, first use the `get-accounts` tool to get a list of their accounts. This will help you to identify the correct `accountId` to use with other tools.
- When using the `get-transactions` tool, always provide a `limit` to avoid returning too many transactions.
- When using the `spending-by-category` tool, be sure to specify a date range.
- When using the `monthly-summary` tool, be sure to specify the number of months.
- When using the `balance-history` tool, be sure to specify the number of months.
- Always use the `errorFromCatch` utility to handle errors.
- Always use the `success` or `successWithJson` utilities to return successful responses.