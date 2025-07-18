## FEATURE:

Should fix linting issues in the codebase. This may include

- Wrong or missing types - In that case should add proper types when you can identify them. If you can't identify the types, should add proper type annotations.
- For external dependency types, check documentation
  - Example - @actual-app/api has types in @actual-app/api/@types/loot-core/src/server/api-models.js . If types are not found, check documentation with actualbudget/docs in context7

## EXAMPLES:

## DOCUMENTATION:

ESLint documentation: retrieve from context7 MCP latest documentation and best practices

## OTHER CONSIDERATIONS:

- Don't use any or unknown types for quick fix
- Identify each error and strategy as part of this PRP
