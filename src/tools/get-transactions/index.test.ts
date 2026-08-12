import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

vi.mock('../../actual-api.js', () => ({
  getTransactions: vi.fn(),
  getCategories: vi.fn(),
  getPayees: vi.fn(),
}));

import { getTransactions, getCategories, getPayees } from '../../actual-api.js';

describe('get-transactions tool - uncategorized filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPayees).mockResolvedValue([]);
    vi.mocked(getCategories).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: 'cat-dining', name: 'Dining', group_id: 'grp-1' } as any,
    ]);
  });

  it('excludes split parents from uncategorized results', async () => {
    vi.mocked(getTransactions).mockResolvedValue([
      // Split parent: no category of its own, its child splits carry the categories.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: 'parent-1', account: 'acc-1', date: '2024-05-01', amount: -3000, is_parent: true } as any,
      // A categorized child split.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: 'child-1', account: 'acc-1', date: '2024-05-01', amount: -3000, is_child: true, category: 'cat-dining' } as any,
      // A genuinely uncategorized plain transaction.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: 'plain-1', account: 'acc-1', date: '2024-05-02', amount: -1000, payee: null } as any,
    ]);

    const result = await handler({ accountId: 'acc-1', uncategorized: true });

    expect(result.isError).toBeUndefined();
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('plain-1');
    expect(text).not.toContain('parent-1');
    expect(text).not.toContain('child-1');
  });

  it('excludes transfers from uncategorized results', async () => {
    vi.mocked(getTransactions).mockResolvedValue([
      // A transfer has no category but is categorized by design; it must not be treated as uncategorized.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: 'transfer-1', account: 'acc-1', date: '2024-05-01', amount: -5000, transfer_id: 'tx-other' } as any,
      // A genuinely uncategorized plain transaction.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: 'plain-1', account: 'acc-1', date: '2024-05-02', amount: -1000, payee: null } as any,
    ]);

    const result = await handler({ accountId: 'acc-1', uncategorized: true });

    expect(result.isError).toBeUndefined();
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('plain-1');
    expect(text).not.toContain('transfer-1');
  });
});
