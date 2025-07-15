# PRP: Vitest Unit Testing Framework Implementation for src/core

## Goal

Introduce Vitest testing framework to the `src/core` module with co-located test files, proper TypeScript configuration, and comprehensive unit test coverage for all core functionality.

## Why

- **Code Quality**: Establish a foundation for unit testing to catch bugs early and ensure code reliability
- **Refactoring Safety**: Enable safe refactoring of core modules with confidence in test coverage
- **Documentation**: Tests serve as living documentation of expected behavior
- **Development Speed**: Faster feedback loop for developers working on core functionality
- **Future Growth**: Establish testing patterns that can be extended to other modules

## What

Implementation of Vitest testing framework focused exclusively on the `src/core` module with:

- Co-located test files (e.g., `data-fetcher.test.ts` alongside `data-fetcher.ts`)
- TypeScript configuration optimized for testing
- Separate build configuration to exclude tests from production builds
- Comprehensive test coverage for all core functionality
- Proper mocking and testing utilities setup

### Success Criteria

- [ ] All files in `src/core` except empty files have corresponding `.test.ts` files
- [ ] `npm run test` executes all tests successfully
- [ ] `npm run build` excludes test files from production build
- [ ] Test coverage reporting is configured and working
- [ ] TypeScript compilation works for both test and build contexts
- [ ] Tests follow consistent patterns and best practices

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://vitest.dev/guide/
  why: Core Vitest setup and configuration patterns

- url: https://vitest.dev/config/
  why: Configuration options for vitest.config.ts

- url: https://vitest.dev/guide/mocking.html
  why: ESM module mocking patterns and vi.mock usage

- url: https://vitest.dev/guide/in-source.html
  why: Understanding in-source testing and co-location patterns

- file: examples/vitest.config.ts
  why: Reference configuration with proper TypeScript support

- file: examples/tsconfig.json
  why: Node16 module resolution pattern for Vitest compatibility

- file: examples/tsconfig.build.json
  why: Separate build configuration excluding tests

- file: src/core/index.ts
  why: Current module exports and structure to understand testing scope

- file: src/core/types/domain.ts
  why: Type definitions that will be used in tests

- file: src/core/aggregation/group-by.ts
  why: Example of class-based module requiring comprehensive testing

- file: src/core/mapping/category-mapper.ts
  why: Complex class with constructor and multiple methods to test
```

### Current Codebase Structure

```bash
src/
├── core/
│   ├── aggregation/
│   │   ├── group-by.ts           # GroupAggregator class
│   │   ├── sort-by.ts
│   │   ├── sum-by.ts
│   │   └── transaction-grouper.ts
│   ├── data/
│   │   ├── fetch-accounts.ts     # Simple async function
│   │   ├── fetch-categories.ts
│   │   └── fetch-transactions.ts
│   ├── input/
│   │   ├── argument-parser.ts    # Currently minimal
│   │   └── validators.ts
│   ├── mapping/
│   │   ├── category-classifier.ts
│   │   ├── category-mapper.ts    # Complex class with Map operations
│   │   └── transaction-mapper.ts
│   └── types/
│       └── domain.ts             # Interface definitions
├── actual-api.ts
├── index.ts
└── tools/
```

### Desired Codebase Structure Post-Implementation

```bash
src/
├── core/
│   ├── aggregation/
│   │   ├── group-by.ts
│   │   ├── group-by.test.ts      # NEW: Unit tests for GroupAggregator
│   │   ├── sort-by.ts            # Empty file, skip test
│   │   ├── sum-by.ts             # Empty file, skip test
│   │   ├── transaction-grouper.ts
│   │   └── transaction-grouper.test.ts # NEW: Unit tests
│   ├── data/
│   │   ├── fetch-accounts.ts
│   │   ├── fetch-accounts.test.ts # NEW: Mock actual-api calls
│   │   ├── fetch-categories.ts
│   │   ├── fetch-categories.test.ts # NEW: Unit tests
│   │   ├── fetch-transactions.ts
│   │   └── fetch-transactions.test.ts # NEW: Unit tests
│   ├── input/
│   │   ├── argument-parser.ts # Empty file, skip test
│   │   ├── validators.ts # Empty file, skip test
│   ├── mapping/
│   │   ├── category-classifier.ts # Empty file, skip test
│   │   ├── category-mapper.ts
│   │   ├── category-mapper.test.ts # NEW: Complex class testing
│   │   ├── transaction-mapper.ts # Empty file, skip test
│   └── types/
│       └── domain.ts             # No tests needed (interfaces only)
├── vitest.config.ts              # NEW: Vitest configuration
├── tsconfig.json                 # MODIFIED: For test compatibility
├── tsconfig.build.json           # NEW: Build-only configuration
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Current tsconfig uses ESNext + bundler, but Vitest needs Node16
// Current: "module": "ESNext", "moduleResolution": "bundler"
// Needed: "module": "Node16", "moduleResolution": "Node16"

// CRITICAL: Files use .js imports even in TypeScript
// Example: import { getAccounts } from "../../actual-api.js"
// Vitest needs alias configuration to handle this

// CRITICAL: ESM modules require careful mocking
// Use vi.mock() for module mocking, not jest.mock()
// Mock must be called before imports in test files

// CRITICAL: Build configuration must exclude .test.ts files
// Use separate tsconfig.build.json that excludes test files
// Update package.json build script to use tsconfig.build.json

// CRITICAL: Package.json is type: "module" (ESM)
// Vitest configuration must use ES modules syntax
// Test files must use ES import/export syntax
```

## Implementation Blueprint

### Data Models and Structure

The existing domain types in `src/core/types/domain.ts` will be used for test data creation:

```typescript
// Test data factories for consistent testing
interface TestDataFactory {
  createAccount(overrides?: Partial<Account>): Account;
  createTransaction(overrides?: Partial<Transaction>): Transaction;
  createCategory(overrides?: Partial<Category>): Category;
  createCategoryGroup(overrides?: Partial<CategoryGroup>): CategoryGroup;
}
```

### List of Tasks to be Completed

```yaml
Task 1: Install Vitest Dependencies
ADD to package.json devDependencies:
  - vitest: "^2.0.0"
  - @vitest/ui: "^2.0.0"
  - vite-tsconfig-paths: "^5.0.0"
  - @types/node: "^20.11.24" (already present)

Task 2: Create Vitest Configuration
CREATE vitest.config.ts:
  - MIRROR pattern from: examples/vitest.config.ts
  - MODIFY to include src/core/**/*.test.ts pattern
  - KEEP alias configuration for .js imports
  - ADD coverage configuration for src/core only

Task 3: Update TypeScript Configuration
MODIFY tsconfig.json:
  - CHANGE "module": "ESNext" to "module": "Node16"
  - CHANGE "moduleResolution": "bundler" to "moduleResolution": "Node16"
  - ADD "types": ["vitest/globals", "node"]
  - ADD "include": ["src/**/*", "vitest.config.ts"]

CREATE tsconfig.build.json:
  - EXTEND tsconfig.json
  - EXCLUDE test files: ["**/*.test.ts", "vitest.config.ts"]
  - KEEP build-specific options (declaration, outDir, etc.)

Task 4: Update Package.json Scripts
MODIFY package.json scripts:
  - CHANGE "build": "tsc" to "tsc -p tsconfig.build.json"
  - ADD "test": "vitest"
  - ADD "test:ui": "vitest --ui"
  - ADD "test:run": "vitest run"
  - ADD "test:coverage": "vitest run --coverage"

Task 5: Create Test Files for Data Module
CREATE src/core/data/fetch-accounts.test.ts:
  - MOCK ../../actual-api.js module
  - TEST successful account fetching
  - TEST error handling scenarios

CREATE src/core/data/fetch-categories.test.ts:
CREATE src/core/data/fetch-transactions.test.ts:
  - MIRROR pattern from fetch-accounts.test.ts
  - MODIFY for respective functions

Task 6: Create Test Files for Aggregation Module
CREATE src/core/aggregation/group-by.test.ts:
  - TEST GroupAggregator.aggregateAndSort method
  - TEST sorting by absolute values
  - TEST category grouping logic
  - TEST empty input handling

CREATE src/core/aggregation/sort-by.test.ts:
CREATE src/core/aggregation/sum-by.test.ts:
CREATE src/core/aggregation/transaction-grouper.test.ts:
  - FOLLOW similar testing patterns for each module

Task 7: Create Test Files for Mapping Module
CREATE src/core/mapping/category-mapper.test.ts:
  - TEST CategoryMapper constructor with sample data
  - TEST getCategoryName method
  - TEST getGroupInfo method
  - TEST isInvestmentCategory method
  - TEST edge cases (unknown categories, missing groups)

CREATE src/core/mapping/category-classifier.test.ts:
CREATE src/core/mapping/transaction-mapper.test.ts:
  - MIRROR testing patterns from category-mapper.test.ts

Task 8: Create Test Files for Input Module
CREATE src/core/input/argument-parser.test.ts:
CREATE src/core/input/validators.test.ts:
  - PREPARE for future implementation
  - CREATE placeholder tests that can be expanded
```

### Per Task Pseudocode

```typescript
// Task 2: vitest.config.ts
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/core/**/*.test.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/core/**/*.ts"],
      exclude: ["src/core/**/*.test.ts", "src/core/types/domain.ts"],
    },
    alias: {
      "^(\\.{1,2}/.*)\\.js$": "$1", // Handle .js imports in TypeScript
    },
  },
});

// Task 5: fetch-accounts.test.ts pattern
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAllAccounts } from "./fetch-accounts.js";

// CRITICAL: Mock before imports
vi.mock("../../actual-api.js", () => ({
  getAccounts: vi.fn(),
}));

import { getAccounts } from "../../actual-api.js";

describe("fetchAllAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return accounts from API", async () => {
    const mockAccounts = [{ id: "1", name: "Test Account" }];
    vi.mocked(getAccounts).mockResolvedValue(mockAccounts);

    const result = await fetchAllAccounts();

    expect(result).toEqual(mockAccounts);
    expect(getAccounts).toHaveBeenCalledOnce();
  });

  it("should handle API errors", async () => {
    vi.mocked(getAccounts).mockRejectedValue(new Error("API Error"));

    await expect(fetchAllAccounts()).rejects.toThrow("API Error");
  });
});

// Task 6: group-by.test.ts pattern
import { describe, it, expect } from "vitest";
import { GroupAggregator } from "./group-by.js";
import type { CategorySpending } from "../types/domain.js";

describe("GroupAggregator", () => {
  const aggregator = new GroupAggregator();

  it("should aggregate and sort spending by group", () => {
    const input: Record<string, CategorySpending> = {
      cat1: {
        id: "1",
        name: "Food",
        group: "Living",
        isIncome: false,
        total: -100,
        transactions: 5,
      },
      cat2: {
        id: "2",
        name: "Rent",
        group: "Living",
        isIncome: false,
        total: -800,
        transactions: 1,
      },
      cat3: {
        id: "3",
        name: "Salary",
        group: "Income",
        isIncome: true,
        total: 2000,
        transactions: 1,
      },
    };

    const result = aggregator.aggregateAndSort(input);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Income"); // Highest absolute value
    expect(result[0].total).toBe(2000);
    expect(result[1].name).toBe("Living");
    expect(result[1].total).toBe(-900);
  });

  it("should handle empty input", () => {
    const result = aggregator.aggregateAndSort({});
    expect(result).toEqual([]);
  });
});
```

### Integration Points

```yaml
DEPENDENCIES:
  - add to: package.json devDependencies
  - pattern: "vitest", "@vitest/ui", "vite-tsconfig-paths"

CONFIGURATION:
  - modify: tsconfig.json (module resolution)
  - create: tsconfig.build.json (build exclusions)
  - create: vitest.config.ts (test configuration)

SCRIPTS:
  - modify: package.json scripts
  - pattern: "test": "vitest", "build": "tsc -p tsconfig.build.json"

GITIGNORE:
  - add: coverage/ (for test coverage reports)
  - pattern: existing node_modules, build patterns remain
```

## Validation Loop

### Level 1: Configuration & Setup

```bash
# Install dependencies
npm install

# Verify TypeScript compilation for tests
npx tsc --noEmit -p tsconfig.json

# Expected: No compilation errors for test files
```

### Level 2: Basic Test Execution

```bash
# Run tests to verify framework setup
npm run test

# Expected: All tests pass (even if minimal)
# If failing: Check import paths, mock configurations, TypeScript issues
```

### Level 3: Build Verification

```bash
# Ensure build excludes test files
npm run build

# Verify test files are excluded
ls -la build/core/

# Expected: No .test.js files in build output
# If test files present: Check tsconfig.build.json exclusions
```

### Level 4: Coverage and Quality

```bash
# Run with coverage
npm run test:coverage

# Expected: Coverage report generated for src/core
# Expected: >80% coverage for implemented modules
```

### Level 5: Individual Module Testing

```bash
# Test specific modules
npx vitest run src/core/aggregation/group-by.test.ts
npx vitest run src/core/mapping/category-mapper.test.ts

# Expected: Each module tests pass independently
# If failing: Check module-specific mocking and data setup
```

## Final Validation Checklist

- [ ] All tests pass: `npm run test`
- [ ] Build works and excludes tests: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Coverage reports generate: `npm run test:coverage`
- [ ] Each core module has corresponding test file
- [ ] Test files follow naming convention: `*.test.ts`
- [ ] Mock configurations work for external dependencies
- [ ] UI tests work: `npm run test:ui`

## Quality Score Assessment

**Confidence Level: 8/10**

**Strengths:**

- Comprehensive context provided from existing codebase
- Clear TypeScript configuration requirements understood
- Vitest documentation and patterns well-researched
- Specific file structure and naming conventions defined
- Validation gates are executable and comprehensive

**Potential Challenges:**

- ESM module mocking complexity in existing codebase
- TypeScript configuration changes may need iteration
- Some core modules may need refactoring for testability

**Success Factors:**

- Co-location pattern simplifies test discovery
- Existing type definitions provide good test data structure
- Clear validation loop enables iterative improvement
- Focus on single module reduces complexity

---

## Anti-Patterns to Avoid

- ❌ Don't create tests that simply call the function without assertions
- ❌ Don't mock everything - test real logic where possible
- ❌ Don't skip error case testing
- ❌ Don't use any/unknown types in test files
- ❌ Don't commit failing tests or skip them without good reason
- ❌ Don't test implementation details - focus on behavior
- ❌ Don't create overly complex test setup that's hard to maintain
