import { describe, it, expect } from 'vitest';
import { isSplitTransaction, buildSplitConversion } from './build-split.js';

describe('isSplitTransaction', () => {
  it('should return true when is_parent is set', () => {
    expect(isSplitTransaction({ is_parent: true })).toBe(true);
  });

  it('should return true when subtransactions are present', () => {
    expect(isSplitTransaction({ subtransactions: [{ amount: -100 }] })).toBe(true);
  });

  it('should return false for a plain transaction', () => {
    expect(isSplitTransaction({ is_parent: false, subtransactions: [] })).toBe(false);
  });

  it('should return false when nothing indicates a split', () => {
    expect(isSplitTransaction({})).toBe(false);
  });

  it('should return false for a null transaction', () => {
    expect(isSplitTransaction(null)).toBe(false);
  });
});

describe('buildSplitConversion', () => {
  // Deterministic id factory so we can assert exact output.
  const makeGenerator = (): (() => string) => {
    let n = 0;
    return () => `generated-${++n}`;
  };

  it('should build fully-formed children that inherit account and date', () => {
    const result = buildSplitConversion({
      parentId: 'txn-1',
      account: 'acc-1',
      date: '2024-05-01',
      subtransactions: [
        { amount: -3000, category: 'cat-a' },
        { amount: -2000, category: 'cat-b', notes: 'Soap' },
      ],
      generateId: makeGenerator(),
    });

    expect(result).toEqual({
      is_parent: true,
      category: null,
      subtransactions: [
        {
          id: 'generated-1',
          account: 'acc-1',
          date: '2024-05-01',
          amount: -3000,
          parent_id: 'txn-1',
          is_child: true,
          sort_order: 0,
          category: 'cat-a',
        },
        {
          id: 'generated-2',
          account: 'acc-1',
          date: '2024-05-01',
          amount: -2000,
          parent_id: 'txn-1',
          is_child: true,
          sort_order: -1,
          category: 'cat-b',
          notes: 'Soap',
        },
      ],
    });
  });

  it('should preserve caller-provided child ids and generate the rest', () => {
    const result = buildSplitConversion({
      parentId: 'txn-1',
      account: 'acc-1',
      date: '2024-05-01',
      subtransactions: [{ id: 'existing-child', amount: -1000 }, { amount: -500 }],
      generateId: makeGenerator(),
    });

    const children = result.subtransactions as Array<{ id: string }>;
    expect(children[0].id).toBe('existing-child');
    expect(children[1].id).toBe('generated-1');
  });

  it('should omit optional category and notes when not supplied', () => {
    const result = buildSplitConversion({
      parentId: 'txn-1',
      account: 'acc-1',
      date: '2024-05-01',
      subtransactions: [{ amount: -1000 }],
      generateId: makeGenerator(),
    });

    const child = (result.subtransactions as Array<Record<string, unknown>>)[0];
    expect(child).not.toHaveProperty('category');
    expect(child).not.toHaveProperty('notes');
  });

  it('should propagate the parent payee to every child when provided', () => {
    const result = buildSplitConversion({
      parentId: 'txn-1',
      account: 'acc-1',
      date: '2024-05-01',
      payee: 'payee-9',
      subtransactions: [{ amount: -1000 }, { amount: -500 }],
      generateId: makeGenerator(),
    });

    const payees = (result.subtransactions as Array<{ payee?: string }>).map((c) => c.payee);
    expect(payees).toEqual(['payee-9', 'payee-9']);
  });

  it('should omit payee on children when the parent has none', () => {
    const withNull = buildSplitConversion({
      parentId: 'txn-1',
      account: 'acc-1',
      date: '2024-05-01',
      payee: null,
      subtransactions: [{ amount: -1000 }],
      generateId: makeGenerator(),
    });
    const withUndefined = buildSplitConversion({
      parentId: 'txn-1',
      account: 'acc-1',
      date: '2024-05-01',
      subtransactions: [{ amount: -1000 }],
      generateId: makeGenerator(),
    });

    expect((withNull.subtransactions as Array<Record<string, unknown>>)[0]).not.toHaveProperty('payee');
    expect((withUndefined.subtransactions as Array<Record<string, unknown>>)[0]).not.toHaveProperty('payee');
  });

  it('should number sort_order in descending offsets to preserve order', () => {
    const result = buildSplitConversion({
      parentId: 'txn-1',
      account: 'acc-1',
      date: '2024-05-01',
      subtransactions: [{ amount: -1 }, { amount: -2 }, { amount: -3 }],
      generateId: makeGenerator(),
    });

    const orders = (result.subtransactions as Array<{ sort_order: number }>).map((c) => c.sort_order);
    expect(orders).toEqual([0, -1, -2]);
  });
});
