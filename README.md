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

#### Transaction & Account Management

- **`get-transactions`** - Retrieve and filter transactions by account, date, amount, category, or payee
- **`create-transaction`** - Create a new transaction in an account with optional category, payee, and notes
- **`update-transaction`** - Update an existing transaction with new category, payee, notes, or amount
- **`split-transaction`** *(write access)* - Split an existing transaction into two or more subtransactions; split amounts must sum exactly to the original amount. The original transaction is replaced by a new split parent (its ID changes; both IDs are returned). Reconciled transactions, existing splits, and transfer legs are rejected
- **`get-accounts`** - Retrieve a list of all accounts with their current balance and ID
- **`balance-history`** - View account balance changes over time

#### Durable receipt queue

- **`record-receipt`** *(write access)* - Store structured receipt extraction and return a generated receipt UUID
- **`get-receipts`** - List receipts by `pending`, `matched`, `needs-review`, or `expired` status (defaults to `pending`)
- **`update-receipt`** *(write access)* - Apply a validated lifecycle transition and matching metadata

The receipt queue supports intake before a bank transaction clears and does not require the Actual API to be available. `record-receipt` requires a caller-generated UUID `intakeId` in addition to `merchant`, `purchaseDate` (`YYYY-MM-DD`), `total` in integer cents, optional `accountHint` (an account nickname, not credentials), and one or more `lineGroups` containing `description`, `category`, and integer-cent `amount`. Optional `tax`, `discount`, and `notes` fields may retain structured extraction details.

Tax and discount are **informational only**: include their allocated effect in the line groups, and ensure all line-group amounts sum exactly to `total`. Sums are checked with exact integer arithmetic. Totals and individual amounts are limited to an absolute value of 1,000,000,000 cents (and totals must be positive). Merchants are limited to 200 characters, account hints to 100, descriptions and categories to 200, notes and review reasons to 2,000, and each receipt to 100 line groups.

Receipts begin as `pending`. `intakeId` is the sole idempotency key: retry the same structurally equivalent payload with the same UUID to receive the existing receipt in any lifecycle status. Reusing an intake UUID with different data is rejected; identical legitimate purchases remain separate when callers generate different intake UUIDs. The receipt's server-generated `id` is separate. A transition to `matched` requires `matchedTransactionId` and records `matchedAt`; a transition to `needs-review` requires `reason`. `matched` and `expired` are terminal. Retrying the current status is accepted only when its lifecycle metadata agrees; contradictory retries fail.

The queue performs no automatic transaction matching. The assistant should only split/update an Actual transaction after an exact amount and unique merchant/date/account match; ambiguous candidates should become `needs-review`. Matched records returned by `get-receipts` include internal Actual `matchedTransactionId` values. This deployment assumes the same authenticated client can already call `get-transactions`; do not expose receipt results to broader clients without filtering those IDs.

Only structured data is retained. **Receipt image bytes, URLs, and filesystem paths are neither accepted nor stored.** Unknown fields are rejected both at intake and when loading the queue. The queue is limited to 10 MiB and 10,000 records. It is durably persisted to `receipts.json` under `ACTUAL_MCP_RECEIPT_DIR`, or under `$ACTUAL_DATA_DIR/receipts` when the dedicated setting is absent (defaulting to `~/.actual/receipts`): writes use a private temporary file, flush it before atomic rename, then flush the parent directory. The storage path is server configuration and cannot be supplied through tool arguments. Enable `record-receipt` and `update-receipt` with `--enable-write`; `ACTUAL_MCP_ALLOWED_TOOLS` / `--allowed-tools` restrictions apply to all three receipt tools.

#### Reporting & Analytics

- **`spending-by-category`** - Generate spending breakdowns categorized by type
- **`monthly-summary`** - Get monthly income, expenses, and savings metrics

#### Budget Management

- **`get-budget-months`** - Retrieve the months available in the budget
- **`get-budget-month`** - Retrieve category groups and budget totals for a `YYYY-MM` month
- **`set-budget-amount`** *(write access)* - Set a category's budget amount using integer minor units (including zero or negative values)
- **`set-budget-carryover`** *(write access)* - Enable or disable carryover for a category in a month
- **`run-bank-sync`** *(write access)* - Sync one linked account by ID, or all linked accounts when no ID is provided

#### Categories

- **`get-grouped-categories`** - Retrieve a list of all category groups with their categories
- **`create-category`** - Create a new category within a category group
- **`update-category`** - Update an existing category's name or group
- **`delete-category`** - Delete a category
- **`create-category-group`** - Create a new category group
- **`update-category-group`** - Update a category group's name
- **`delete-category-group`** - Delete a category group

#### Payees

- **`get-payees`** - Retrieve a list of all payees with their details
- **`create-payee`** - Create a new payee
- **`update-payee`** - Update an existing payee's details
- **`delete-payee`** - Delete a payee

#### Rules

- **`get-rules`** - Retrieve a list of all transaction rules
- **`create-rule`** - Create a new transaction rule with conditions and actions
- **`update-rule`** - Update an existing transaction rule
- **`delete-rule`** - Delete a transaction rule

### Prompts

- **`financial-insights`** - Generate insights and recommendations based on your financial data
- **`budget-review`** - Analyze your budget compliance and suggest adjustments

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Actual Budget](https://actualbudget.com/) installed and configured
- [Claude Desktop](https://claude.ai/download) or another MCP-compatible client
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (optional)

### Remote access

Pull the latest docker image:

```
docker pull sstefanov/actual-mcp:latest
```

### Local setup

1. Clone the repository:

```bash
git clone https://github.com/s-stefanov/actual-mcp.git
cd actual-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the server:

```bash
npm run build
```

4. Build the local docker image (optional):

```bash
docker build -t <local-image-name> .
```

5. Configure environment variables (optional):

```bash
# Path to your Actual Budget data directory (default: ~/.actual)
export ACTUAL_DATA_DIR="/path/to/your/actual/data"

# Optional dedicated receipt queue directory (default: $ACTUAL_DATA_DIR/receipts)
export ACTUAL_MCP_RECEIPT_DIR="/path/to/private/receipt-queue"

# If using a remote Actual server
export ACTUAL_SERVER_URL="https://your-actual-server.com"
export ACTUAL_PASSWORD="your-password"

# Specific budget to use (optional)
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"
```

Optional: separate encryption budget password

If your Actual setup requires a different password to unlock the local/encrypted budget data than the server authentication password, you can set `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` in addition to `ACTUAL_PASSWORD`.

```bash
# If server auth and encryption/unlock use different passwords
export ACTUAL_BUDGET_ENCRYPTION_PASSWORD="your-encryption-password"
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

Add the following to your configuration...

### a. Using Node.js (npx version):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "npx",
      "args": ["-y", "actual-mcp", "--enable-write"],
      "env": {
        "ACTUAL_DATA_DIR": "path/to/your/data",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_SERVER_URL": "http://your-actual-server.com",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}

### a. Using Node.js (local only):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["/path/to/your/clone/build/index.js", "--enable-write"],
      "env": {
        "ACTUAL_DATA_DIR": "path/to/your/data",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_SERVER_URL": "http://your-actual-server.com",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}
```

### b. Using Docker (local or remote images):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/path/to/your/data:/data",
        "-e",
        "ACTUAL_PASSWORD=your-password",
        "-e",
        "ACTUAL_SERVER_URL=https://your-actual-server.com",
        "-e",
        "ACTUAL_BUDGET_SYNC_ID=your-budget-id",
        "sstefanov/actual-mcp:latest",
        "--enable-write"
      ]
    }
  }
}
```

After saving the configuration, restart Claude Desktop.

> 💡 `ACTUAL_DATA_DIR` is optional if you're using `ACTUAL_SERVER_URL`.

> 💡 Use `--enable-write` to enable write-access tools.

### Restricting exposed tools

By default, the server exposes every read tool, plus every write tool when `--enable-write` is set. To expose only an explicit subset, provide a comma-separated allowlist with `ACTUAL_MCP_ALLOWED_TOOLS` or `--allowed-tools`. Names are trimmed and duplicates are ignored. The CLI option takes precedence over the environment variable, and an unknown name causes startup to fail. Allowlisting a write tool does not bypass the requirement for `--enable-write`.

Docker example using the environment variable:

```bash
docker run -i --rm \
  -e ACTUAL_SERVER_URL="https://your-actual-server.com" \
  -e ACTUAL_PASSWORD="your-password" \
  -e ACTUAL_BUDGET_SYNC_ID="your-budget-id" \
  -e ACTUAL_MCP_ALLOWED_TOOLS="get-accounts, get-transactions, create-transaction" \
  sstefanov/actual-mcp:latest \
  --enable-write
```

The equivalent CLI form is `--allowed-tools "get-accounts,get-transactions,create-transaction"`. If both forms are provided, the CLI value is used.

## Running an SSE Server

To expose the server over a port using Docker:

```bash
docker run -i --rm \
  -p 3000:3000 \
  -v "/path/to/your/data:/data" \
  -e ACTUAL_PASSWORD="your-password" \
  -e ACTUAL_SERVER_URL="http://your-actual-server.com" \
  -e ACTUAL_BUDGET_SYNC_ID="your-budget-id" \
  -e BEARER_TOKEN="your-bearer-token" \
  sstefanov/actual-mcp:latest \
  --sse --enable-write --enable-bearer
```

> ⚠️ Important: When using --enable-bearer, the BEARER_TOKEN environment variable must be set.  
> 🔒 This is highly recommended if you're exposing your server via a public URL.

## Example Queries

Once connected, you can ask Claude questions like:

- "What's my current account balance?"
- "Show me my spending by category last month"
- "How much did I spend on groceries in January?"
- "What's my savings rate over the past 3 months?"
- "Analyze my budget and suggest areas to improve"

## Usage with Codex CLI

Example Codex configuration:

In `~/.codex/config.toml`:
```toml
[mcp_servers.actual-budget]
url = "http://localhost:3000"
```

Point Codex at the same port you pass to `npm start -- --sse --port <PORT>`.

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

## Fork Modifications

This fork includes the following changes from the upstream [s-stefanov/actual-mcp](https://github.com/s-stefanov/actual-mcp):

- **`@actual-app/api` bumped from `^26.3.0` to `^26.5.0`** — updates the Actual Budget API client to the latest version for compatibility with newer Actual server releases.
- **Balance cutoff fix** — `getAccountBalance` calls now pass a far-future cutoff date (`2099-01-01`) so that future-dated pending transactions are included in balance calculations. Without this fix, banks that pre-date pending transactions (showing them in the future) would cause reported balances to be lower than the actual cleared balance.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
