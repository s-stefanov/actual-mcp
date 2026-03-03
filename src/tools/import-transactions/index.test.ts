// ----------------------------
// IMPORT TRANSACTIONS TOOL TESTS
// ----------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';
import * as actualApi from '../../actual-api.js';
import { ImportTransactionsArgs } from '../../types.js';
import { textContent } from '../../utils/response.js';

// Mock the actual-api module
vi.mock('../../actual-api.js', () => ({
  importTransactions: vi.fn(),
}));

// Mock @actual-app/api utils so amountToInteger works without a real API connection
vi.mock('@actual-app/api', () => ({
  utils: {
    amountToInteger: (n: number) => Math.round(n * 100),
  },
}));

describe('import-transactions tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct tool name and description', () => {
      expect(schema.name).toBe('import-transactions');
      expect(schema.description).toContain('Import a list of transactions');
    });

    it('should require accountId and transactions fields', () => {
      expect(schema.inputSchema.required).toContain('accountId');
      expect(schema.inputSchema.required).toContain('transactions');
    });

    it('should have all expected properties in schema', () => {
      const properties = schema.inputSchema.properties;
      expect(properties).toHaveProperty('accountId');
      expect(properties).toHaveProperty('transactions');
      expect(properties).toHaveProperty('defaultCleared');
      expect(properties).toHaveProperty('dryRun');
    });
  });

  describe('handler - success cases', () => {
    it('should import transactions and return a summary', async () => {
      vi.mocked(actualApi.importTransactions).mockResolvedValue({
        added: ['tx-1', 'tx-2'],
        updated: [],
        errors: [],
      });

      const args: ImportTransactionsArgs = {
        accountId: 'account-123',
        transactions: [
          { date: '2025-01-01', amount: -50.0 },
          { date: '2025-01-02', amount: -30.24, imported_id: 'bank-id-1' },
        ],
      };

      const result = await handler(args);

      expect(actualApi.importTransactions).toHaveBeenCalledWith(
        'account-123',
        [
          { date: '2025-01-01', amount: -5000, account: 'account-123' },
          { date: '2025-01-02', amount: -3024, imported_id: 'bank-id-1', account: 'account-123' },
        ],
        { defaultCleared: undefined, dryRun: undefined }
      );
      expect(result.isError).toBeUndefined();
      expect(textContent(result.content[0])).toContain('Added: 2 transaction(s)');
      expect(textContent(result.content[0])).toContain('Updated: 0 transaction(s)');
      expect(textContent(result.content[0])).toContain('Errors: none');
    });

    it('should include [DRY RUN] prefix when dryRun is true', async () => {
      vi.mocked(actualApi.importTransactions).mockResolvedValue({
        added: [],
        updated: [],
        errors: [],
      });

      const args: ImportTransactionsArgs = {
        accountId: 'account-123',
        transactions: [{ date: '2025-01-01', amount: -3.24 }],
        dryRun: true,
      };

      const result = await handler(args);

      expect(actualApi.importTransactions).toHaveBeenCalledWith('account-123', expect.any(Array), {
        defaultCleared: undefined,
        dryRun: true,
      });
      expect(result.isError).toBeUndefined();
      expect(textContent(result.content[0])).toContain('[DRY RUN]');
    });

    it('should pass defaultCleared option to the API', async () => {
      vi.mocked(actualApi.importTransactions).mockResolvedValue({
        added: ['tx-1'],
        updated: [],
        errors: [],
      });

      const args: ImportTransactionsArgs = {
        accountId: 'account-123',
        transactions: [{ date: '2025-01-01', amount: -3.24 }],
        defaultCleared: true,
      };

      const result = await handler(args);

      expect(actualApi.importTransactions).toHaveBeenCalledWith('account-123', expect.any(Array), {
        defaultCleared: true,
        dryRun: undefined,
      });
      expect(result.isError).toBeUndefined();
    });

    it('should report errors from the API result', async () => {
      vi.mocked(actualApi.importTransactions).mockResolvedValue({
        added: [],
        updated: [],
        errors: [{ message: 'Invalid date on row 1' }],
      });

      const args: ImportTransactionsArgs = {
        accountId: 'account-123',
        transactions: [{ date: '2025-01-01', amount: -3.24 }],
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(textContent(result.content[0])).toContain('Invalid date on row 1');
    });
  });

  describe('handler - edge cases', () => {
    it('should import a single transaction with only required fields', async () => {
      vi.mocked(actualApi.importTransactions).mockResolvedValue({
        added: ['tx-single'],
        updated: [],
        errors: [],
      });

      const args: ImportTransactionsArgs = {
        accountId: 'account-456',
        transactions: [{ date: '2025-06-15', amount: 0 }],
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(textContent(result.content[0])).toContain('Added: 1 transaction(s)');
    });

    it('should handle both added and updated in same import', async () => {
      vi.mocked(actualApi.importTransactions).mockResolvedValue({
        added: ['tx-new'],
        updated: ['tx-existing'],
        errors: [],
      });

      const args: ImportTransactionsArgs = {
        accountId: 'account-456',
        transactions: [
          { date: '2025-01-01', amount: -10.5, imported_id: 'new-id' },
          { date: '2025-01-02', amount: -20.0, imported_id: 'existing-id' },
        ],
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(textContent(result.content[0])).toContain('Added: 1 transaction(s)');
      expect(textContent(result.content[0])).toContain('Updated: 1 transaction(s)');
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when accountId is missing', async () => {
      const args = {
        transactions: [{ date: '2025-01-01', amount: -3.24 }],
      } as unknown as ImportTransactionsArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('accountId');
    });

    it('should return error when transactions array is empty', async () => {
      const args: ImportTransactionsArgs = {
        accountId: 'account-123',
        transactions: [] as unknown as ImportTransactionsArgs['transactions'],
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
    });

    it('should return error when a transaction is missing date', async () => {
      const args = {
        accountId: 'account-123',
        transactions: [{ amount: -3.24 }],
      } as unknown as ImportTransactionsArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('date');
    });

    it('should return error when a transaction is missing amount', async () => {
      const args = {
        accountId: 'account-123',
        transactions: [{ date: '2025-01-01' }],
      } as unknown as ImportTransactionsArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('amount');
    });

    it('should return error when date format is invalid', async () => {
      const args = {
        accountId: 'account-123',
        transactions: [{ date: '01/01/2025', amount: -3.24 }],
      } as unknown as ImportTransactionsArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('date must be in YYYY-MM-DD format');
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(actualApi.importTransactions).mockRejectedValue(new Error('Connection refused'));

      const args: ImportTransactionsArgs = {
        accountId: 'account-123',
        transactions: [{ date: '2025-01-01', amount: -3.24 }],
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(textContent(result.content[0])).toContain('Connection refused');
    });
  });
});
