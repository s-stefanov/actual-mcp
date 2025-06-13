# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript and sets executable permissions
- **Watch**: `npm run watch` - Continuous compilation during development
- **Test connection**: `node build/index.js --test-resources` - Verify Actual Budget data connection
- **Debug with MCP Inspector**: `npm run inspector` - Debug MCP server communication over stdio

## Architecture Overview

This is an MCP (Model Context Protocol) server that exposes Actual Budget financial data to LLMs. The server follows a modular architecture:

### Core Structure
- **Main server** (`src/index.ts`) - MCP server initialization and transport setup
- **MCP Integration** - Uses `@modelcontextprotocol/sdk` for server implementation
- **Actual Budget API** (`src/actual-api.ts`) - Manages connection lifecycle to Actual Budget data

### Data Flow Architecture
The server operates through three main MCP interfaces:
1. **Resources** - Static data exposure (accounts, transactions)
2. **Tools** - Interactive data queries with parameters
3. **Prompts** - Template-based financial analysis

### Tool Architecture
Each tool follows a consistent modular pattern in `src/tools/`:
- `index.ts` - Schema definition and main handler
- `input-parser.ts` - Argument validation and parsing
- `data-fetcher.ts` - Data retrieval from Actual Budget
- `report-generator.ts` - Output formatting
- `types.ts` - Tool-specific type definitions

### Core Utilities (`src/core/`)
Shared functionality organized by purpose:
- **Data fetching** - Account, category, and transaction retrieval
- **Input handling** - Argument parsing and validation
- **Aggregation** - Group-by, sum-by, and sort operations
- **Mapping** - Data transformation and category classification

### Environment Configuration
- `ACTUAL_DATA_DIR` - Local Actual Budget data directory (default: ~/.actual)
- `ACTUAL_SERVER_URL` - Remote Actual server URL (optional)
- `ACTUAL_PASSWORD` - Server authentication (required if using remote server)
- `ACTUAL_BUDGET_SYNC_ID` - Specific budget ID (optional)

## Available Tools
- `get-transactions` - Filter and retrieve transactions
- `spending-by-category` - Categorized spending analysis  
- `monthly-summary` - Monthly financial metrics
- `balance-history` - Account balance tracking over time

The server communicates over stdio as required by MCP protocol.