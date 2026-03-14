import { describe, it, expect, vi, beforeEach } from 'vitest';

// CRITICAL: Mock before imports
vi.mock('../../../actual-api.js', () => ({
  getAccounts: vi.fn(),
  getTransactions: vi.fn(),
  updateTransaction: vi.fn(),
}));

import { handler, schema } from './index.js';
import { getAccounts, getTransactions, updateTransaction } from '../../../actual-api.js';

const ACCOUNT_A = { id: 'acct-1', name: 'Checking' };
const ACCOUNT_B = { id: 'acct-2', name: 'Savings' };

const TX_1 = { id: 'tx-1', account: 'acct-1', date: '2024-01-15', amount: -5000 };
const TX_2 = { id: 'tx-2', account: 'acct-2', date: '2024-01-15', amount: 5000 };

describe('link-transfer tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('link-transfer');
      expect(schema.description).toContain('transfer');
    });

    it('should require transactionId1 and transactionId2', () => {
      expect(schema.inputSchema.required).toContain('transactionId1');
      expect(schema.inputSchema.required).toContain('transactionId2');
    });
  });

  describe('handler - happy path', () => {
    it('should link two transactions from different accounts with opposite amounts', async () => {
      vi.mocked(getAccounts).mockResolvedValue([ACCOUNT_A, ACCOUNT_B] as never);
      vi.mocked(getTransactions).mockImplementation(async (accountId) => {
        if (accountId === 'acct-1') return [TX_1] as never;
        if (accountId === 'acct-2') return [TX_2] as never;
        return [] as never;
      });
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const result = await handler({ transactionId1: 'tx-1', transactionId2: 'tx-2' });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('tx-1');
      expect(text).toContain('tx-2');

      expect(updateTransaction).toHaveBeenCalledTimes(2);
      expect(updateTransaction).toHaveBeenCalledWith('tx-1', { transfer_id: 'tx-2' });
      expect(updateTransaction).toHaveBeenCalledWith('tx-2', { transfer_id: 'tx-1' });
    });
  });

  describe('handler - validation', () => {
    it('should return error when transactionId1 is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handler({ transactionId2: 'tx-2' } as any);

      expect(result.isError).toBe(true);
      expect(getAccounts).not.toHaveBeenCalled();
    });

    it('should return error when transactionId2 is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handler({ transactionId1: 'tx-1' } as any);

      expect(result.isError).toBe(true);
      expect(getAccounts).not.toHaveBeenCalled();
    });

    it('should return error when transaction 1 is not found', async () => {
      vi.mocked(getAccounts).mockResolvedValue([ACCOUNT_A, ACCOUNT_B] as never);
      vi.mocked(getTransactions).mockImplementation(async (accountId) => {
        if (accountId === 'acct-2') return [TX_2] as never;
        return [] as never;
      });

      const result = await handler({ transactionId1: 'tx-missing', transactionId2: 'tx-2' });

      expect(result.isError).toBe(true);
      expect(updateTransaction).not.toHaveBeenCalled();
    });

    it('should return error when transaction 2 is not found', async () => {
      vi.mocked(getAccounts).mockResolvedValue([ACCOUNT_A, ACCOUNT_B] as never);
      vi.mocked(getTransactions).mockImplementation(async (accountId) => {
        if (accountId === 'acct-1') return [TX_1] as never;
        return [] as never;
      });

      const result = await handler({ transactionId1: 'tx-1', transactionId2: 'tx-missing' });

      expect(result.isError).toBe(true);
      expect(updateTransaction).not.toHaveBeenCalled();
    });

    it('should return error when both transactions are from the same account', async () => {
      const tx1Same = { id: 'tx-1', account: 'acct-1', date: '2024-01-15', amount: -5000 };
      const tx2Same = { id: 'tx-2', account: 'acct-1', date: '2024-01-15', amount: 5000 };

      vi.mocked(getAccounts).mockResolvedValue([ACCOUNT_A] as never);
      vi.mocked(getTransactions).mockResolvedValue([tx1Same, tx2Same] as never);

      const result = await handler({ transactionId1: 'tx-1', transactionId2: 'tx-2' });

      expect(result.isError).toBe(true);
      expect(updateTransaction).not.toHaveBeenCalled();
    });

    it('should return error when amounts are not opposite', async () => {
      const txBadAmount = { id: 'tx-2', account: 'acct-2', date: '2024-01-15', amount: 3000 };

      vi.mocked(getAccounts).mockResolvedValue([ACCOUNT_A, ACCOUNT_B] as never);
      vi.mocked(getTransactions).mockImplementation(async (accountId) => {
        if (accountId === 'acct-1') return [TX_1] as never;
        if (accountId === 'acct-2') return [txBadAmount] as never;
        return [] as never;
      });

      const result = await handler({ transactionId1: 'tx-1', transactionId2: 'tx-2' });

      expect(result.isError).toBe(true);
      expect(updateTransaction).not.toHaveBeenCalled();
    });
  });

  describe('handler - error handling', () => {
    it('should return error when updateTransaction throws on first call', async () => {
      vi.mocked(getAccounts).mockResolvedValue([ACCOUNT_A, ACCOUNT_B] as never);
      vi.mocked(getTransactions).mockImplementation(async (accountId) => {
        if (accountId === 'acct-1') return [TX_1] as never;
        if (accountId === 'acct-2') return [TX_2] as never;
        return [] as never;
      });
      vi.mocked(updateTransaction).mockRejectedValue(new Error('Database error'));

      const result = await handler({ transactionId1: 'tx-1', transactionId2: 'tx-2' });

      expect(result.isError).toBe(true);
    });

    it('should return partial write error when first updateTransaction succeeds but second fails', async () => {
      vi.mocked(getAccounts).mockResolvedValue([ACCOUNT_A, ACCOUNT_B] as never);
      vi.mocked(getTransactions).mockImplementation(async (accountId) => {
        if (accountId === 'acct-1') return [TX_1] as never;
        if (accountId === 'acct-2') return [TX_2] as never;
        return [] as never;
      });
      vi.mocked(updateTransaction).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Write failed'));

      const result = await handler({ transactionId1: 'tx-1', transactionId2: 'tx-2' });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('tx-1');
      expect(text).toContain('tx-2');
      expect(text).toContain('manually update');
    });
  });

  describe('handler - account name fallback', () => {
    it('should fall back to account ID when account object is not in accounts list', async () => {
      // account acct-2 is missing from the accounts list (e.g. deleted between fetch and lookup)
      vi.mocked(getAccounts).mockResolvedValue([ACCOUNT_A] as never);
      vi.mocked(getTransactions).mockImplementation(async (accountId) => {
        if (accountId === 'acct-1') return [TX_1, TX_2] as never;
        return [] as never;
      });
      // make TX_2 appear in acct-1 scan but with a different account field
      const TX_2_ORPHAN = { id: 'tx-2', account: 'acct-deleted', date: '2024-01-15', amount: 5000 };
      vi.mocked(getTransactions).mockImplementation(async (accountId) => {
        if (accountId === 'acct-1') return [TX_1, TX_2_ORPHAN] as never;
        return [] as never;
      });
      vi.mocked(updateTransaction).mockResolvedValue(undefined);

      const result = await handler({ transactionId1: 'tx-1', transactionId2: 'tx-2' });

      expect(result.isError).toBeUndefined();
      const text = (result.content[0] as { text: string }).text;
      // account name for tx-2 should fall back to 'acct-deleted' (the account ID)
      expect(text).toContain('acct-deleted');
    });
  });
});
