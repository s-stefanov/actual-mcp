# GitHub Actions PR Validation Workflow

## Purpose
Create a comprehensive GitHub Actions workflow that validates pull requests by ensuring code builds successfully, passes all tests, and meets quality standards before merging.

## Core Principles
1. **Quality Gates**: Every PR must pass build, test, and type checking before merge
2. **Fast Feedback**: Provide immediate feedback to developers on code quality
3. **Zero-Config**: Work with existing project setup without requiring new dependencies
4. **Security First**: Follow GitHub Actions security best practices
5. **Global rules**: Follow all rules in CLAUDE.md

---

## Goal
Create a GitHub Actions workflow named `pr-validation.yml` that runs on every pull request to validate:
- ✅ TypeScript compilation (build)
- ✅ Unit tests pass with coverage reporting
- ✅ Type checking with strict TypeScript
- ✅ Code formatting consistency
- 🚧 ESLint setup prepared (commented out for future activation)

## Why
- **Quality Assurance**: Prevent broken code from reaching main branch
- **Developer Experience**: Fast feedback loop for developers on code quality
- **Automation**: Reduce manual review burden by automating quality checks
- **Consistency**: Ensure all code meets project standards before merge
- **Integration**: Complement existing release-please workflow

## What
A GitHub Actions workflow that triggers on pull requests and validates code quality through automated checks.

### Success Criteria
- [ ] Workflow triggers on all pull requests to main branch
- [ ] Build step compiles TypeScript successfully 
- [ ] All unit tests pass with coverage reporting
- [ ] TypeScript type checking passes with strict mode
- [ ] ESLint configuration prepared but commented out for future use
- [ ] Workflow uses latest action versions and security best practices
- [ ] Clear feedback provided in PR checks and comments
- [ ] Fast execution time through parallel jobs and caching

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-nodejs
  why: Official GitHub Actions Node.js setup patterns and best practices
  
- url: https://github.com/marketplace/actions/vitest-coverage-report
  why: Vitest coverage reporting integration for PR comments
  
- file: .github/workflows/release-please.yml
  why: Existing workflow patterns and Node.js 22 version usage
  
- file: package.json
  why: Available scripts (build, test, test:coverage) and dependencies
  
- file: vitest.config.ts
  why: Test configuration including coverage setup and include patterns
  
- file: tsconfig.json
  why: TypeScript strict mode configuration for quality validation

- doc: examples/github-actions-ci-cd-best-practices.instructions.md
  section: Security, Optimization, Testing Strategy
  critical: Latest action versions, caching strategies, security permissions

- url: https://typescript-eslint.io/getting-started
  why: ESLint TypeScript setup for future configuration (commented out initially)
  
- url: https://eslint.org/docs/latest/use/getting-started
  why: ESLint flat config format and modern setup patterns
```

### Current Codebase Tree
```bash
.
├── .github/
│   └── workflows/
│       └── release-please.yml    # Only existing workflow
├── src/                          # TypeScript source code
│   ├── core/                     # Core business logic with tests
│   ├── tools/                    # MCP tools implementation
│   └── index.ts                  # Main entry point
├── package.json                  # Scripts: build, test, test:coverage
├── tsconfig.json                 # Strict TypeScript configuration
├── vitest.config.ts              # Vitest test configuration
└── CLAUDE.md                     # Project rules and conventions
```

### Desired Codebase Tree (after implementation)
```bash
.github/
└── workflows/
    ├── release-please.yml        # Existing release workflow
    └── pr-validation.yml         # NEW: PR validation workflow
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: Project uses ESM modules (type: "module" in package.json)
// GOTCHA: No ESLint/Prettier configured - TypeScript strict mode provides current validation
// FUTURE: ESLint setup should use flat config format (eslint.config.mjs) not legacy .eslintrc
// FUTURE: ESLint requires @typescript-eslint/parser and @typescript-eslint/eslint-plugin
// GOTCHA: Vitest configured for src/core/**/*.test.ts pattern only
// CRITICAL: Node.js 22 used in production (match in CI)
// PATTERN: npm ci used for clean dependency installation
// SECURITY: Use explicit permissions for GITHUB_TOKEN
// OPTIMIZATION: Cache npm dependencies for faster builds
```

## Implementation Blueprint

### Workflow Architecture
```yaml
# Single workflow with parallel jobs for fast feedback
name: PR Validation
trigger: pull_request to main branch
jobs:
  - build-and-test (primary validation)
  - type-check (parallel TypeScript validation)
```

### Data Models and Structure
```typescript
// Workflow will validate these project patterns:
interface ProjectStructure {
  buildScript: "tsc -p tsconfig.build.json"     // TypeScript compilation
  testScript: "vitest run"                      // Unit tests
  coverageScript: "vitest run --coverage"      // Test coverage
  typeCheck: "tsc --noEmit"                    // Type validation
}

interface QualityGates {
  build: boolean      // Must compile successfully
  tests: boolean      // All tests must pass
  types: boolean      // No TypeScript errors
  coverage: number    // Coverage reporting (not blocking)
}
```

### List of Tasks (Implementation Order)

```yaml
Task 1 - Create PR Validation Workflow:
CREATE .github/workflows/pr-validation.yml:
  - MIRROR security patterns from: .github/workflows/release-please.yml
  - USE Node.js 22 to match production environment
  - IMPLEMENT latest GitHub Actions (checkout@v4, setup-node@v4)
  - CONFIGURE explicit permissions for security

Task 2 - Build and Test Job:
CONFIGURE build-and-test job:
  - SETUP Node.js environment with npm caching
  - RUN npm ci for clean dependency installation
  - EXECUTE npm run build for TypeScript compilation
  - EXECUTE npm run test for unit tests
  - GENERATE coverage report with npm run test:coverage

Task 3 - Type Checking Job:
CONFIGURE type-check job (parallel):
  - SETUP identical Node.js environment
  - RUN TypeScript compiler with --noEmit flag
  - VALIDATE strict type checking passes

Task 4 - Coverage Integration:
INTEGRATE Vitest Coverage Report Action:
  - ADD davelosert/vitest-coverage-report-action@v2
  - CONFIGURE to comment coverage results on PR
  - REQUIRE json-summary reporter (already configured)

Task 5 - Optimization and Security:
APPLY best practices:
  - CACHE npm dependencies for performance
  - SET explicit GITHUB_TOKEN permissions
  - USE fail-fast: false for comprehensive reporting
  - CONFIGURE appropriate timeouts

Task 6 - ESLint Preparation (COMMENTED OUT):
PREPARE ESLint setup for future activation:
  - CREATE eslint.config.mjs with TypeScript support (commented)
  - ADD ESLint dependencies to package.json devDependencies (commented)
  - INCLUDE commented ESLint step in workflow
  - DOCUMENT activation instructions for future use
```

### Per Task Pseudocode

```yaml
# Task 1 - Workflow Structure
name: PR Validation
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

permissions:
  contents: read          # Read repository contents
  pull-requests: write    # Comment on PRs with coverage
  checks: write          # Update check status

# Task 2 - Build and Test Job  
build-and-test:
  runs-on: ubuntu-latest
  steps:
    - checkout@v4                    # Latest stable checkout
    - setup-node@v4 with cache     # Node.js 22 + npm caching
    - npm ci                        # Clean install (faster than npm install)
    - npm run build                 # TypeScript compilation validation
    - npm run test:coverage         # Unit tests + coverage generation

# Task 3 - Type Check Job (parallel)
type-check:
  runs-on: ubuntu-latest  
  steps:
    - checkout@v4
    - setup-node@v4 with cache
    - npm ci
    - npx tsc --noEmit             # Type checking only (no output)

# Task 4 - Coverage Reporting
coverage-report:
  needs: build-and-test
  if: always()                     # Run even if tests fail
  steps:
    - vitest-coverage-report-action # Comment coverage on PR

# Task 6 - ESLint Preparation (COMMENTED OUT)
# FUTURE: Uncomment when ready to activate ESLint
# lint:
#   runs-on: ubuntu-latest
#   steps:
#     - checkout@v4
#     - setup-node@v4 with cache
#     - npm ci
#     - npm run lint                # Future: npx eslint .

# ESLint Config File Template (commented):
# eslint.config.mjs:
#   import eslint from '@eslint/js';
#   import tseslint from 'typescript-eslint';
#   export default tseslint.config(
#     eslint.configs.recommended,
#     tseslint.configs.recommended,
#   );
```

### Integration Points
```yaml
EXISTING_WORKFLOWS:
  - coordinate with: .github/workflows/release-please.yml
  - ensure: No conflicts with existing release automation
  - pattern: Both use Node.js 22 for consistency

PACKAGE_SCRIPTS:
  - use existing: npm run build, npm run test, npm run test:coverage
  - no changes: Leverage existing Vitest configuration
  - future: npm run lint (when ESLint is uncommented)
  
QUALITY_GATES:
  - required: build must succeed for PR merge
  - required: tests must pass for PR merge  
  - optional: coverage reporting for visibility
  - required: type checking must pass
  - future: ESLint validation (when uncommented)
  
ESLINT_PREPARATION:
  - create: eslint.config.mjs (commented out)
  - dependencies: @typescript-eslint/parser, @typescript-eslint/eslint-plugin (commented)
  - workflow: lint job prepared but commented out
```

## Validation Loop

### Level 1: Syntax & Workflow Validation
```bash
# Validate workflow syntax
cd .github/workflows
cat pr-validation.yml | yq eval '.' -  # YAML syntax check
gh workflow validate pr-validation.yml  # GitHub CLI validation

# Expected: Valid YAML, no syntax errors
```

### Level 2: Local Testing Simulation
```bash
# Simulate what CI will run locally
npm ci                    # Clean install
npm run build            # Should compile without errors
npm run test             # Should pass all tests
npm run test:coverage    # Should generate coverage report
npx tsc --noEmit        # Should pass type checking

# FUTURE: When ESLint is uncommented
# npm run lint            # Should pass ESLint checks
# npx eslint .            # Alternative ESLint command

# Expected: All commands succeed with 0 exit code
```

### Level 3: PR Integration Test
```bash
# Create test PR to validate workflow
git checkout -b test/pr-validation
git add .github/workflows/pr-validation.yml
git commit -m "Add PR validation workflow"
git push origin test/pr-validation

# Create PR via GitHub CLI
gh pr create --title "Test PR Validation Workflow" --body "Testing new CI workflow"

# Expected: 
# - Workflow triggers automatically
# - All checks pass (build, test, type-check)
# - Coverage comment appears on PR
# - Green checkmarks in PR status
```

## Final Validation Checklist
- [ ] Workflow triggers on pull requests to main: `gh workflow list`
- [ ] Build job succeeds: TypeScript compiles without errors
- [ ] Test job succeeds: All Vitest tests pass
- [ ] Type check job succeeds: No TypeScript errors
- [ ] Coverage report generated: JSON summary created
- [ ] PR comment added: Coverage summary visible
- [ ] ESLint configuration prepared but commented out: `eslint.config.mjs` exists but inactive
- [ ] ESLint dependencies documented: Future installation instructions clear
- [ ] ESLint workflow step commented: Ready for future activation
- [ ] Security permissions correct: Read-only by default
- [ ] Performance optimized: npm caching enabled
- [ ] No conflicts: Existing release workflow unaffected

---

## Anti-Patterns to Avoid
- ❌ Don't activate ESLint immediately - prepare setup but keep commented out
- ❌ Don't use legacy .eslintrc format - use modern flat config (eslint.config.mjs)
- ❌ Don't change existing test patterns - leverage Vitest configuration
- ❌ Don't use outdated action versions - security risk
- ❌ Don't grant excessive permissions - principle of least privilege  
- ❌ Don't skip caching - significant performance impact
- ❌ Don't hardcode Node.js version - use variable for consistency
- ❌ Don't ignore existing project patterns - follow CLAUDE.md conventions

## External References for Implementation
- [GitHub Actions Node.js Setup](https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-nodejs)
- [Vitest Coverage Action](https://github.com/marketplace/actions/vitest-coverage-report)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Setup Node Action](https://github.com/actions/setup-node)
- [TypeScript ESLint Getting Started](https://typescript-eslint.io/getting-started)
- [ESLint Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files)

## Confidence Score: 9/10
High confidence due to:
- ✅ Comprehensive codebase analysis completed
- ✅ Existing patterns identified and followed
- ✅ Security best practices included
- ✅ Performance optimizations applied
- ✅ Clear validation steps defined
- ✅ External documentation researched
- ✅ ESLint preparation strategy defined (commented out for safe implementation)
- ⚠️ Minor uncertainty on exact Vitest coverage integration details