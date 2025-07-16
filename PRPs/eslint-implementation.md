# ESLint Implementation PRP

## 🎯 Objective
Implement ESLint with TypeScript support for the mcp-actualbudget project to enforce code quality, consistency, and catch potential issues early in development.

## 📋 Context Analysis

### Current Project State
Based on comprehensive codebase analysis:

- **No ESLint configuration** currently exists
- **Well-structured TypeScript project** with strict type checking
- **Vitest testing framework** with comprehensive coverage
- **Consistent coding patterns** already established
- **Example ESLint configuration** available at `examples/eslint.config.ts`
- **Good development practices** already in place

### Project Structure
```
src/
├── core/               # Shared utilities and data handling
├── tools/              # Feature-based MCP tools
├── actual-api.ts       # API connection lifecycle
└── index.ts           # Main server entry point
```

### Dependencies Analysis
**Current package.json does not include:**
- `eslint` (core linting engine)
- `@typescript-eslint/eslint-plugin` (TypeScript-specific rules)
- `@typescript-eslint/parser` (TypeScript parser)
- `eslint-plugin-prettier` (Prettier integration)
- `eslint-config-prettier` (Prettier config compatibility)
- `prettier` (code formatter)
- `globals` (global variables definitions)

## 🔍 Research Findings

### ESLint 9 + TypeScript ESLint Best Practices (2024-2025)

#### Key Updates
- **ESLint 9.0.0** (April 2024) - Flat config enabled by default
- **TypeScript ESLint v8** - Improved flat config support
- **Unified `typescript-eslint` package** - Replaces separate parser/plugin packages

#### Recommended Modern Configuration Pattern
```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', '**/*.d.ts', 'coverage/']
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
```

### Documentation References
- **ESLint Official Docs**: https://eslint.org/docs/latest/use/configure/configuration-files
- **TypeScript ESLint Getting Started**: https://typescript-eslint.io/getting-started/
- **ESLint Migration Guide**: https://eslint.org/docs/latest/use/configure/migration-guide
- **Modern Linting 2025**: https://advancedfrontends.com/eslint-flat-config-typescript-javascript/

### Example Configuration Analysis
The project already has a well-structured example at `examples/eslint.config.ts`:
- **Flat config format** (modern ESLint 9.x compatible)
- **TypeScript support** with proper parser configuration
- **Prettier integration** for code formatting
- **Vitest globals** for testing environment
- **Custom rules** for unused variables with underscore prefix
- **Proper ignores** for build and config files

## 🚀 Implementation Blueprint

### Phase 1: Dependency Installation
```bash
npm install --save-dev \
  eslint \
  typescript-eslint \
  eslint-plugin-prettier \
  eslint-config-prettier \
  prettier \
  globals
```

### Phase 2: Configuration Files

#### 1. Main ESLint Configuration (`eslint.config.js`)
```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['node_modules', 'dist', 'build', 'coverage', '**/*.d.ts'],
  },
  
  // Base configurations
  eslint.configs.recommended,
  
  // Global language options
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
  },
  
  // TypeScript-specific configuration
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier,
    },
    rules: {
      // TypeScript-specific rules
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-const': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      
      // Prettier integration
      'prettier/prettier': 'error',
    },
  },
  
  // Prettier configuration (disables conflicting rules)
  prettierConfig,
);
```

#### 2. TypeScript Configuration for ESLint (`tsconfig.eslint.json`)
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": [
    "src/**/*",
    "tests/**/*",
    "examples/**/*",
    "*.ts",
    "*.js"
  ]
}
```

#### 3. Prettier Configuration (`.prettierrc`)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### Phase 3: Package.json Scripts
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "quality": "npm run lint && npm run format:check && npm run type-check"
  }
}
```

### Phase 4: VS Code Integration (`.vscode/settings.json`)
```json
{
  "eslint.experimental.useFlatConfig": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 📝 Implementation Tasks

### Task 1: Install Dependencies
- [ ] Install ESLint and TypeScript ESLint packages
- [ ] Install Prettier and related plugins
- [ ] Install globals package for environment definitions

### Task 2: Create Configuration Files
- [ ] Create `eslint.config.js` with modern flat config
- [ ] Create `tsconfig.eslint.json` for ESLint-specific TypeScript config
- [ ] Create `.prettierrc` for code formatting rules
- [ ] Create/update `.vscode/settings.json` for editor integration

### Task 3: Update Package.json
- [ ] Add linting scripts to package.json
- [ ] Add formatting scripts to package.json
- [ ] Add quality check script combining lint + format + type-check

### Task 4: Fix Initial Linting Issues
- [ ] Run `npm run lint` to identify existing issues
- [ ] Fix any linting errors or warnings
- [ ] Ensure all files pass formatting checks

### Task 5: Integration with Existing Workflow
- [ ] Update CLAUDE.md with new linting commands
- [ ] Ensure linting works with existing test setup
- [ ] Verify compatibility with build process

## 🔍 Quality Validation Gates

### Syntax and Configuration Validation
```bash
# Verify ESLint configuration is valid
npx eslint --print-config src/index.ts

# Check for syntax errors in config
node eslint.config.js

# Verify TypeScript configuration
npx tsc --noEmit --project tsconfig.eslint.json
```

### Linting Validation
```bash
# Run linting on entire codebase
npm run lint

# Check if auto-fix works
npm run lint:fix

# Verify formatting
npm run format:check
```

### Integration Validation
```bash
# Run full quality check
npm run quality

# Run existing tests (should still pass)
npm run test

# Run build (should still work)
npm run build
```

### Performance Validation
```bash
# Time linting performance
time npm run lint

# Check for config issues
npx eslint --debug src/index.ts
```

## 🎯 Success Criteria

### Functional Requirements
- [ ] ESLint successfully lints all TypeScript files
- [ ] Prettier formats code consistently
- [ ] No conflicts between ESLint and Prettier
- [ ] TypeScript type-aware linting works correctly
- [ ] Existing tests continue to pass

### Integration Requirements
- [ ] VS Code integration works seamlessly
- [ ] Linting integrates with existing build process
- [ ] Scripts work across different environments
- [ ] Configuration is maintainable and extendable

### Performance Requirements
- [ ] Linting completes in under 10 seconds for full codebase
- [ ] No significant impact on development workflow
- [ ] Reasonable memory usage during linting

## 🔧 Error Handling Strategy

### Common Issues and Solutions

#### Issue: "Parsing error: Cannot read tsconfig.json"
**Solution**: Ensure `tsconfig.eslint.json` exists and `projectService: true` is set correctly.

#### Issue: "Cannot resolve parser '@typescript-eslint/parser'"
**Solution**: Install `typescript-eslint` package and use modern import syntax.

#### Issue: "Prettier and ESLint conflicts"
**Solution**: Use `eslint-config-prettier` to disable conflicting rules.

#### Issue: "Performance issues with large codebase"
**Solution**: Optimize `projectService` configuration and use specific file patterns.

## 📊 Implementation Score

**Confidence Level: 9/10**

### Scoring Rationale
- **High-quality example** already exists in the project
- **Comprehensive research** with latest best practices
- **Modern tooling** (ESLint 9, TypeScript ESLint v8)
- **Clear implementation path** with specific tasks
- **Executable validation gates** for testing
- **Error handling strategy** for common issues
- **Integration with existing workflow** considered

### Risk Mitigation
- **Low risk** - ESLint is mature, widely-used tooling
- **Example configuration** provides proven starting point
- **Comprehensive documentation** and community support
- **Incremental implementation** allows for adjustments
- **Rollback plan** - simply remove configuration files

## 🔗 References and Resources

### Official Documentation
- [ESLint Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files)
- [TypeScript ESLint Getting Started](https://typescript-eslint.io/getting-started/)
- [ESLint Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide)

### Best Practices Guides
- [Modern Linting in 2025](https://advancedfrontends.com/eslint-flat-config-typescript-javascript/)
- [ESLint 9 Flat Config Tutorial](https://dev.to/aolyang/eslint-9-flat-config-tutorial-2bm5)

### Package Documentation
- [typescript-eslint Package](https://www.npmjs.com/package/typescript-eslint)
- [eslint-config-prettier](https://www.npmjs.com/package/eslint-config-prettier)
- [globals Package](https://www.npmjs.com/package/globals)

---

*This PRP provides comprehensive context and implementation guidance for successful one-pass ESLint implementation in the mcp-actualbudget project.*