import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.js';

vi.mock('../../../actual-api.js', () => ({
  mergePayees: vi.fn(),
}));

import { mergePayees } from '../../../actual-api.js';

describe('merge-payees handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should merge payees into the target', async () => {
    vi.mocked(mergePayees).mockResolvedValue(undefined);

    const result = await handler({ targetId: 'target', mergeIds: ['a', 'b'] });

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('2 payee(s)') });
    expect(mergePayees).toHaveBeenCalledWith('target', ['a', 'b']);
  });

  it('should drop duplicates and the target itself from mergeIds', async () => {
    vi.mocked(mergePayees).mockResolvedValue(undefined);

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

  it('should return an error response when the API throws', async () => {
    vi.mocked(mergePayees).mockRejectedValue(new Error('Payee not found'));

    const result = await handler({ targetId: 'target', mergeIds: ['a'] });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('Payee not found') });
  });
});
