import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler, schema } from './index.js';

// CRITICAL: Mock before imports
vi.mock('../../actual-api.js', () => ({
  getTransactionById: vi.fn(),
  getPayees: vi.fn(),
  makeTransfer: vi.fn(),
}));

import { getTransactionById, getPayees, makeTransfer } from '../../actual-api.js';

const accountA = 'acc-aaa';
const accountB = 'acc-bbb';
const fromPayeeId = 'payee-transfer-A';
const toPayeeId = 'payee-transfer-B';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tx(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'tx',
    account: accountA,
    amount: -5000,
    date: '2024-01-15',
    transfer_id: null,
    payee: 'some-payee',
    notes: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('make-transfer tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPayees).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: fromPayeeId, name: 'Account A', transfer_acct: accountA } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: toPayeeId, name: 'Account B', transfer_acct: accountB } as any,
    ]);
  });

  describe('schema', () => {
    it('should have correct name and description', () => {
      expect(schema.name).toBe('make-transfer');
      expect(schema.description).toContain('transfer');
    });

    it('should have inputSchema defined', () => {
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.type).toBe('object');
    });
  });

  describe('handler - happy path', () => {
    it('should link two valid transactions as a transfer', async () => {
      const fromTx = tx({ id: 'from', account: accountA, amount: -5000 });
      const toTx = tx({ id: 'to', account: accountB, amount: 5000 });
      vi.mocked(getTransactionById).mockImplementation(async (id) => (id === 'from' ? fromTx : toTx));
      vi.mocked(makeTransfer).mockResolvedValue({});

      const result = await handler({ fromId: 'from', toId: 'to' });

      expect(result.isError).toBeUndefined();
      expect(makeTransfer).toHaveBeenCalledWith(fromTx, toTx, fromPayeeId, toPayeeId);
      expect((result.content[0] as { text: string }).text).toContain('Successfully linked');
    });
  });

  describe('handler - validation errors', () => {
    it('should reject when fromId equals toId', async () => {
      const result = await handler({ fromId: 'same', toId: 'same' });
      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('must be different');
      expect(getTransactionById).not.toHaveBeenCalled();
    });

    it('should reject when fromId missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handler({ toId: 'to' } as any);
      expect(result.isError).toBe(true);
    });

    it('should reject when a transaction is not found', async () => {
      vi.mocked(getTransactionById).mockImplementation(async (id) =>
        id === 'from' ? tx({ id: 'from', account: accountA, amount: -5000 }) : null
      );

      const result = await handler({ fromId: 'from', toId: 'missing' });
      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('not found');
      expect(makeTransfer).not.toHaveBeenCalled();
    });

    it('should reject transactions in the same account', async () => {
      vi.mocked(getTransactionById).mockImplementation(async (id) =>
        tx({ id, account: accountA, amount: id === 'from' ? -5000 : 5000 })
      );

      const result = await handler({ fromId: 'from', toId: 'to' });
      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('same account');
      expect(makeTransfer).not.toHaveBeenCalled();
    });

    it('should reject transactions whose amounts do not cancel out', async () => {
      vi.mocked(getTransactionById).mockImplementation(async (id) =>
        id === 'from'
          ? tx({ id: 'from', account: accountA, amount: -5000 })
          : tx({ id: 'to', account: accountB, amount: 6000 })
      );

      const result = await handler({ fromId: 'from', toId: 'to' });
      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('do not cancel');
      expect(makeTransfer).not.toHaveBeenCalled();
    });

    it('should reject when a transaction is already part of a transfer', async () => {
      vi.mocked(getTransactionById).mockImplementation(async (id) =>
        id === 'from'
          ? tx({ id: 'from', account: accountA, amount: -5000, transfer_id: 'existing' })
          : tx({ id: 'to', account: accountB, amount: 5000 })
      );

      const result = await handler({ fromId: 'from', toId: 'to' });
      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('already part of a transfer');
      expect(makeTransfer).not.toHaveBeenCalled();
    });

    it('should reject when destination account has no transfer payee', async () => {
      vi.mocked(getTransactionById).mockImplementation(async (id) =>
        id === 'from'
          ? tx({ id: 'from', account: accountA, amount: -5000 })
          : tx({ id: 'to', account: 'acc-unknown', amount: 5000 })
      );

      const result = await handler({ fromId: 'from', toId: 'to' });
      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('No transfer payee');
    });
  });

  describe('handler - API errors', () => {
    it('should surface errors from makeTransfer', async () => {
      vi.mocked(getTransactionById).mockImplementation(async (id) =>
        id === 'from'
          ? tx({ id: 'from', account: accountA, amount: -5000 })
          : tx({ id: 'to', account: accountB, amount: 5000 })
      );
      vi.mocked(makeTransfer).mockRejectedValue(new Error('batch update failed'));

      const result = await handler({ fromId: 'from', toId: 'to' });
      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('batch update failed');
    });
  });
});
