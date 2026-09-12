import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTransferPayee } from './resolve-transfer-payee.js';
import * as actualApi from '../../actual-api.js';

vi.mock('../../actual-api.js', () => ({
  getPayees: vi.fn(),
}));

describe('resolveTransferPayee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the id of the payee whose transfer_acct matches the destination account', async () => {
    vi.mocked(actualApi.getPayees).mockResolvedValue([
      { id: 'payee-checking', name: 'Transfer: Checking', transfer_acct: 'checking-account-id' },
      { id: 'payee-savings', name: 'Transfer: Savings', transfer_acct: 'savings-account-id' },
    ]);

    const result = await resolveTransferPayee('savings-account-id');

    expect(result).toBe('payee-savings');
  });

  it('returns null when no payee has that transfer_acct', async () => {
    vi.mocked(actualApi.getPayees).mockResolvedValue([
      { id: 'payee-checking', name: 'Transfer: Checking', transfer_acct: 'checking-account-id' },
    ]);

    const result = await resolveTransferPayee('nonexistent-account-id');

    expect(result).toBeNull();
  });

  it('returns null when getPayees resolves an empty list', async () => {
    vi.mocked(actualApi.getPayees).mockResolvedValue([]);

    const result = await resolveTransferPayee('any-account-id');

    expect(result).toBeNull();
  });
});
