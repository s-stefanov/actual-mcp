# MCP Registry — Post-Publish Directory Checklist

The official registry publish is automated (release-please + mcp-publisher).
These downstream directories reward an explicitly **claimed** listing; do each
once after the first successful registry publish.

- [ ] **Official MCP Registry** — automated on release. Confirm the entry at
  https://registry.modelcontextprotocol.io shows all three packages.
- [ ] **Glama** (https://glama.ai/mcp) — claim ownership to move out of the
  crawled tier; verify the imported description/links.
- [ ] **PulseMCP** — claim the entry to separate verified owner info from
  auto-generated data.
- [ ] **Smithery** (https://smithery.ai) — `smithery mcp publish <url> -n
  s-stefanov/actual-mcp`, or claim the crawled listing.
- [ ] **awesome-mcp-servers** (https://github.com/punkpeye/awesome-mcp-servers)
  — open a PR adding the server under the finance/budgeting category.

## What the scores reward

- **Official registry**: passing namespace auth + package ownership (binary
  gate) → propagates to GitHub MCP registry, VS Code, and others.
- **Glama quality score**: claimed ownership, scanner-readable metadata
  (transport declared ✓), zero-config setup, active repo, clear license,
  complete tool annotations.
- **MCP Toplist ranking**: version count, GitHub release/commit activity,
  stars, listing age. Regular releases (release-please) and stars move this.
