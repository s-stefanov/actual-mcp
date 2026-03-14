# actual-mcp (fork)

personal fork of [s-stefanov/actual-mcp](https://github.com/s-stefanov/actual-mcp) — an MCP server for [Actual Budget](https://actualbudget.org/). see the upstream repo for installation, configuration, and general usage docs.

this fork adds tools and fixes that came out of daily use with Claude Code managing a real budget. most changes are driven by saving context tokens and reducing round trips.

## what's different

**unified query tool** — replaced `get-transactions` and the original `query-transactions` with a single filter-based query tool that covers both. supports AQL-style operators (`$gte`, `$lt`, `$like`, `$oneof`, etc.), name resolution (payee/category names instead of UUIDs), optional summary stats, groupBy, orderBy, and a virtual `tag` filter that matches `#hashtags` in notes.

**bulk operations**
- `bulk-update-transactions` — update multiple transactions in one call (categorizing 140 transactions no longer means 140 tool calls)
- `bulk-create-rules` — create multiple rules at once
- `import-transactions` — bulk import into an account

**budget tools**
- `set-budget-amount` / `set-budget-carryover` — set budgeted amounts and carryover flags
- `set-budget-month` / `copy-budget-month` — configure and copy entire budget months
- `get-budget-months` — list months with budget data

**schedule CRUD** — `get-schedules`, `create-schedule`, `update-schedule`, `delete-schedule`

**tag CRUD** — `get-tags`, `create-tag`, `update-tag`, `delete-tag`

**other additions**
- `get-account-balance` — single account balance without fetching all accounts
- `get-common-payees` — most frequently used payees
- `get-payee-rules` — rules associated with a specific payee
- `get-uncategorized-transactions` — cross-account uncategorized transaction lookup
- `link-transfer` — link two transactions as a transfer between accounts

**fixes**
- timezone bug in monthly summary date parsing
- support for multiple concurrent SSE/HTTP clients

## query-transactions examples

find all food spending this year, sorted by amount:

```json
{
  "filters": {
    "category": "Food",
    "date": { "$gte": "2026-01-01" },
    "amount": { "$lt": 0 }
  },
  "orderBy": { "amount": "asc" },
  "includeSummary": true
}
```

uncategorized transactions:

```json
{
  "filters": {
    "category": null
  }
}
```

transactions tagged #fastfood (matches `#fastfood` in notes):

```json
{
  "filters": {
    "tag": "fastfood"
  },
  "select": ["date", "payee", "amount", "notes"]
}
```

spending by category last month:

```json
{
  "filters": {
    "date": { "$gte": "2026-02-01", "$lte": "2026-02-28" },
    "amount": { "$lt": 0 }
  },
  "groupBy": "category",
  "includeSummary": true
}
```

all filter operators map to AQL: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$like`, `$notlike`, `$regexp`, `$oneof`, `$and`, `$or`. category, payee, and account filters accept names — the tool resolves them to IDs internally.

## running it

runs as an SSE service alongside actual-server in docker compose. see the upstream README for standalone/Claude Desktop setup.

## license

MIT (same as upstream)
