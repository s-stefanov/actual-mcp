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
});
