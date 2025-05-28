# Actual Budget MCP Server

MCP server for integrating Actual Budget with Claude and other LLM assistants.

## Overview

The Actual Budget MCP Server allows you to interact with your personal financial data from [Actual Budget](https://actualbudget.com/) using natural language through LLMs. It exposes your accounts, transactions, and financial metrics through the Model Context Protocol (MCP).

## Features

### Resources
- **Account Listings** - Browse all your accounts with their balances
- **Account Details** - View detailed information about specific accounts
- **Transaction History** - Access transaction data with complete details

### Tools
- **`get-transactions`** - Retrieve and filter transactions by account, date, amount, category, or payee
- **`spending-by-category`** - Generate spending breakdowns categorized by type
- **`monthly-summary`** - Get monthly income, expenses, and savings metrics
- **`balance-history`** - View account balance changes over time

### Prompts
- **`financial-insights`** - Generate insights and recommendations based on your financial data
- **`budget-review`** - Analyze your budget compliance and suggest adjustments

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Actual Budget](https://actualbudget.com/) installed and configured
- [Claude Desktop](https://claude.ai/download) or another MCP-compatible client

### Setup

1. Clone the repository:
```bash
git clone https://github.com/s-stefanov/mcp-actualbudget.git
cd mcp-actualbudget
```

2. Install dependencies:
```bash
npm install
```

3. Build the server:
```bash
npm run build
```

4. Configure environment variables (optional):
```bash
# Path to your Actual Budget data directory (default: ~/.actual)
export ACTUAL_DATA_DIR="/path/to/your/actual/data"

# If using a remote Actual server
export ACTUAL_SERVER_URL="https://your-actual-server.com"
export ACTUAL_PASSWORD="your-password"

# Specific budget to use (optional)
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"
```

## Usage with Claude Desktop

To use this server with Claude Desktop, add it to your Claude configuration:

On MacOS:
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

On Windows:
```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

Add the following to your configuration:
```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["/absolute/path/to/actual-budget-mcp/build/index.js"],
      "env": {
        "ACTUAL_DATA_DIR": "/path/to/your/actual/data"
      }
    }
  }
}
```

After saving the configuration, restart Claude Desktop.

## Example Queries

Once connected, you can ask Claude questions like:

- "What's my current account balance?"
- "Show me my spending by category last month"
- "How much did I spend on groceries in January?"
- "What's my savings rate over the past 3 months?"
- "Analyze my budget and suggest areas to improve"

## Development

For development with auto-rebuild:
```bash
npm run watch
```

### Testing the connection to Actual

To verify the server can connect to your Actual Budget data:
```bash
node build/index.js --test-resources
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. You can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Project Structure

- `index.ts` - Main server implementation
- `types.ts` - Type definitions for API responses and parameters
- `prompts.ts` - Prompt templates for LLM interactions
- `utils.ts` - Helper functions for date formatting and more

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.