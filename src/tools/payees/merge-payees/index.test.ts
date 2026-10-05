import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  getPayees: vi.fn(),
  mergePayees: vi.fn(),
}));

import { getPayees, mergePayees } from '../../../actual-api.js';

const payees = [
  { id: 'target', name: 'Target' },
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'transfer', name: 'Savings', transfer_acct: 'account-1' },
];

describe('merge-payees handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPayees).mockResolvedValue(payees);
    vi.mocked(mergePayees).mockResolvedValue(undefined);
  });

  it('should merge payees into the target', async () => {
    const result = await handler({ targetId: 'target', mergeIds: ['a', 'b'] });

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('2 payee(s)') });
    expect(mergePayees).toHaveBeenCalledWith('target', ['a', 'b']);
  });

  it('should drop duplicates and the target itself from mergeIds', async () => {
    const result = await handler({ targetId: 'target', mergeIds: ['a', 'target', 'a'] });

    expect(result.isError).toBeFalsy();
    expect(mergePayees).toHaveBeenCalledWith('target', ['a']);
  });

  it('should reject mergeIds containing only the target', async () => {
    const result = await handler({ targetId: 'target', mergeIds: ['target'] });

    expect(result.isError).toBe(true);
    expect(mergePayees).not.toHaveBeenCalled();
  });

  it('should reject missing or invalid arguments', async () => {
    expect((await handler({ mergeIds: ['a'] })).isError).toBe(true);
    expect((await handler({ targetId: 'target', mergeIds: [] })).isError).toBe(true);
    expect((await handler({ targetId: 'target', mergeIds: [1] })).isError).toBe(true);
    expect(mergePayees).not.toHaveBeenCalled();
  });

  it('should reject payee IDs that do not exist', async () => {
    const result = await handler({ targetId: 'target', mergeIds: ['a', 'missing'] });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('missing does not exist') });
    expect(mergePayees).not.toHaveBeenCalled();
  });

  it('should reject a transfer payee as the target', async () => {
    const result = await handler({ targetId: 'transfer', mergeIds: ['a'] });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('transfer payee') });
    expect(mergePayees).not.toHaveBeenCalled();
  });

  it('should reject a transfer payee in mergeIds', async () => {
    const result = await handler({ targetId: 'target', mergeIds: ['a', 'transfer'] });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('transfer payee') });
    expect(mergePayees).not.toHaveBeenCalled();
  });

  it('should return an error response when the API throws', async () => {
    vi.mocked(mergePayees).mockRejectedValue(new Error('Database locked'));

    const result = await handler({ targetId: 'target', mergeIds: ['a'] });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('Database locked') });
  });
});
