// ----------------------------
// CREATE TRANSACTION TOOL TESTS
// ----------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';
import * as actualApi from '../../actual-api.js';
import { CreateTransactionArgs } from '../../types.js';

// Helper to extract text from content items (handles union type from SDK)
const getTextContent = (content: unknown): string => {
  const item = content as { type: string; text?: string };
  if (item.type === 'text' && typeof item.text === 'string') {
    return item.text;
  }
  throw new Error(`Expected text content, got ${item.type}`);
};

// Mock the actual-api module
vi.mock('../../actual-api.js', () => ({
  createTransaction: vi.fn(),
}));

describe('create-transaction tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct tool name and description', () => {
      expect(schema.name).toBe('create-transaction');
      expect(schema.description).toBe('Create a new transaction. Use this to add transactions to accounts.');
    });

    it('should require account, date, and amount fields', () => {
      expect(schema.inputSchema.required).toEqual(['account', 'date', 'amount']);
    });

    it('should have all expected properties in schema', () => {
      const properties = schema.inputSchema.properties;
      expect(properties).toHaveProperty('account');
      expect(properties).toHaveProperty('date');
      expect(properties).toHaveProperty('amount');
      expect(properties).toHaveProperty('payee');
      expect(properties).toHaveProperty('payee_name');
      expect(properties).toHaveProperty('category');
      expect(properties).toHaveProperty('notes');
      expect(properties).toHaveProperty('cleared');
      expect(properties).toHaveProperty('subtransactions');
    });
  });

  describe('handler - success cases', () => {
    it('should create a transaction with required fields only', async () => {
      const mockTransactionId = 'transaction-123';
      vi.mocked(actualApi.createTransaction).mockResolvedValue(mockTransactionId);

      const args = {
        account: 'account-456',
        date: '2025-12-18',
        amount: 12030,
      };

      const result = await handler(args);

      expect(actualApi.createTransaction).toHaveBeenCalledWith('account-456', {
        date: '2025-12-18',
        amount: 12030,
      });
      expect(result.isError).toBeUndefined();
      expect(getTextContent(result.content[0])).toContain('Successfully created transaction');
      expect(getTextContent(result.content[0])).toContain(mockTransactionId);
    });

    it('should create a transaction with all optional fields', async () => {
      const mockTransactionId = 'transaction-789';
      vi.mocked(actualApi.createTransaction).mockResolvedValue(mockTransactionId);

      const args = {
        account: 'account-456',
        date: '2025-12-18',
        amount: 12030,
        payee: 'payee-123',
        category: 'category-456',
        notes: 'Test transaction',
        cleared: true,
        imported_id: 'import-123',
      };

      const result = await handler(args);

      expect(actualApi.createTransaction).toHaveBeenCalledWith('account-456', {
        date: '2025-12-18',
        amount: 12030,
        payee: 'payee-123',
        category: 'category-456',
        notes: 'Test transaction',
        cleared: true,
        imported_id: 'import-123',
      });
      expect(result.isError).toBeUndefined();
    });

    it('should create a transaction with subtransactions', async () => {
      const mockTransactionId = 'transaction-split';
      vi.mocked(actualApi.createTransaction).mockResolvedValue(mockTransactionId);

      const args = {
        account: 'account-456',
        date: '2025-12-18',
        amount: 20000,
        subtransactions: [
          { amount: 10000, category: 'cat-1', notes: 'Part 1' },
          { amount: 10000, category: 'cat-2', notes: 'Part 2' },
        ],
      };

      const result = await handler(args);

      expect(actualApi.createTransaction).toHaveBeenCalledWith('account-456', {
        date: '2025-12-18',
        amount: 20000,
        subtransactions: [
          { amount: 10000, category: 'cat-1', notes: 'Part 1' },
          { amount: 10000, category: 'cat-2', notes: 'Part 2' },
        ],
      });
      expect(result.isError).toBeUndefined();
    });
  });

  describe('handler - validation errors', () => {
    it('should return error when account is missing', async () => {
      const args = {
        date: '2025-12-18',
        amount: 12030,
      } as unknown as CreateTransactionArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(getTextContent(result.content[0])).toContain('account');
    });

    it('should return error when account is not a string', async () => {
      const args = {
        account: 123,
        date: '2025-12-18',
        amount: 12030,
      } as unknown as CreateTransactionArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(getTextContent(result.content[0])).toContain('string');
    });

    it('should return error when date is missing', async () => {
      const args = {
        account: 'account-456',
        amount: 12030,
      } as unknown as CreateTransactionArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(getTextContent(result.content[0])).toContain('date');
    });

    it('should return error when date format is invalid', async () => {
      const args = {
        account: 'account-456',
        date: '12/18/2025',
        amount: 12030,
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(getTextContent(result.content[0])).toContain('date must be in YYYY-MM-DD format');
    });

    it('should return error when amount is missing', async () => {
      const args = {
        account: 'account-456',
        date: '2025-12-18',
      } as unknown as CreateTransactionArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(getTextContent(result.content[0])).toContain('amount');
    });

    it('should return error when amount is not a number', async () => {
      const args = {
        account: 'account-456',
        date: '2025-12-18',
        amount: '12030',
      } as unknown as CreateTransactionArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(getTextContent(result.content[0])).toContain('number');
    });

    it('should return error when category is not a string', async () => {
      const args = {
        account: 'account-456',
        date: '2025-12-18',
        amount: 12030,
        category: 123,
      } as unknown as CreateTransactionArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(getTextContent(result.content[0])).toContain('string');
    });

    it('should return error when subtransactions is not an array', async () => {
      const args = {
        account: 'account-456',
        date: '2025-12-18',
        amount: 12030,
        subtransactions: 'not-an-array',
      } as unknown as CreateTransactionArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(getTextContent(result.content[0])).toContain('array');
    });

    it('should return error when subtransaction is missing amount', async () => {
      const args = {
        account: 'account-456',
        date: '2025-12-18',
        amount: 20000,
        subtransactions: [{ category: 'cat-1' }],
      } as unknown as CreateTransactionArgs;

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(getTextContent(result.content[0])).toContain('amount');
    });
  });

  describe('handler - edge cases', () => {
    it('should handle zero amount', async () => {
      const mockTransactionId = 'transaction-zero';
      vi.mocked(actualApi.createTransaction).mockResolvedValue(mockTransactionId);

      const args = {
        account: 'account-456',
        date: '2025-12-18',
        amount: 0,
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(actualApi.createTransaction).toHaveBeenCalledWith('account-456', {
        date: '2025-12-18',
        amount: 0,
      });
    });

    it('should handle negative amount', async () => {
      const mockTransactionId = 'transaction-negative';
      vi.mocked(actualApi.createTransaction).mockResolvedValue(mockTransactionId);

      const args = {
        account: 'account-456',
        date: '2025-12-18',
        amount: -5000,
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(actualApi.createTransaction).toHaveBeenCalledWith('account-456', {
        date: '2025-12-18',
        amount: -5000,
      });
    });

    it('should handle cleared flag as false', async () => {
      const mockTransactionId = 'transaction-uncleared';
      vi.mocked(actualApi.createTransaction).mockResolvedValue(mockTransactionId);

      const args = {
        account: 'account-456',
        date: '2025-12-18',
        amount: 12030,
        cleared: false,
      };

      const result = await handler(args);

      expect(result.isError).toBeUndefined();
      expect(actualApi.createTransaction).toHaveBeenCalledWith('account-456', {
        date: '2025-12-18',
        amount: 12030,
        cleared: false,
      });
    });
  });

  describe('handler - API errors', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API connection failed');
      vi.mocked(actualApi.createTransaction).mockRejectedValue(mockError);

      const args = {
        account: 'account-456',
        date: '2025-12-18',
        amount: 12030,
      };

      const result = await handler(args);

      expect(result.isError).toBe(true);
      expect(getTextContent(result.content[0])).toContain('API connection failed');
    });
  });
});
