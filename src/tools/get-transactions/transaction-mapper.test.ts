import { describe, it, expect } from 'vitest';
import { GetTransactionsMapper } from './transaction-mapper.js';
import type { Transaction } from '../../core/types/domain.js';

describe('GetTransactionsMapper', () => {
  const mapper = new GetTransactionsMapper();

  it('exposes transfer_id as transferId when set', () => {
    const tx: Transaction = {
      id: 'tx-1',
      account: 'acc-1',
      date: '2024-05-01',
      amount: 5000,
      payee_name: 'Savings',
      transfer_id: 'tx-2',
      cleared: true,
    };

    const [mapped] = mapper.map([tx]);

    expect(mapped.transferId).toBe('tx-2');
  });

  it('emits empty transferId for non-transfer transactions', () => {
    const tx: Transaction = {
      id: 'tx-3',
      account: 'acc-1',
      date: '2024-05-02',
      amount: -1234,
      payee_name: 'Coffee Shop',
      category_name: 'Dining',
      cleared: false,
    };

    const [mapped] = mapper.map([tx]);

    expect(mapped.transferId).toBe('');
  });

  it('falls back to placeholders for missing payee, category, and notes', () => {
    const tx: Transaction = {
      id: 'tx-4',
      account: 'acc-1',
      date: '2024-05-03',
      amount: -50,
    };

    const [mapped] = mapper.map([tx]);

    expect(mapped.payee).toBe('(No payee)');
    expect(mapped.category).toBe('(Uncategorized)');
    expect(mapped.notes).toBe('');
    expect(mapped.cleared).toBe(false);
    expect(mapped.transferId).toBe('');
  });

  it('omits subtransactions when the transaction is not a split', () => {
    const tx: Transaction = {
      id: 'tx-5',
      account: 'acc-1',
      date: '2024-05-04',
      amount: -1000,
    };

    const [mapped] = mapper.map([tx]);

    expect(mapped.subtransactions).toBeUndefined();
  });

  it('maps each subtransaction of a split, exposing its own id, payee, and transfer', () => {
    const tx: Transaction = {
      id: 'tx-parent',
      account: 'acc-1',
      date: '2024-05-05',
      amount: -10000,
      is_parent: true,
      subtransactions: [
        {
          id: 'tx-child-1',
          account: 'acc-1',
          date: '2024-05-05',
          amount: -6000,
          category_name: 'Groceries',
          is_child: true,
          parent_id: 'tx-parent',
        },
        {
          id: 'tx-child-2',
          account: 'acc-1',
          date: '2024-05-05',
          amount: -4000,
          payee_name: 'Transfer: Savings',
          transfer_id: 'tx-transfer-counterpart',
          is_child: true,
          parent_id: 'tx-parent',
        },
      ],
    };

    const [mapped] = mapper.map([tx]);

    expect(mapped.subtransactions).toHaveLength(2);
    expect(mapped.subtransactions?.[0]).toMatchObject({ id: 'tx-child-1', category: 'Groceries' });
    expect(mapped.subtransactions?.[1]).toMatchObject({
      id: 'tx-child-2',
      payee: 'Transfer: Savings',
      transferId: 'tx-transfer-counterpart',
    });
  });
});
