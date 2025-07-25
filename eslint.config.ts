import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['node_modules', 'dist', 'build', 'coverage', '**/*.d.ts', 'eslint.config.*'],
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
        projectService: {
          allowDefaultProject: ['*.ts', '*.js', 'vitest.config.ts'],
        },
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
      '@typescript-eslint/no-inferrable-types': 'error',

      // Prettier integration
      'prettier/prettier': 'error',
    },
  },

  // Prettier configuration (disables conflicting rules)
  prettierConfig
);
