import { getAccounts } from '../../actual-api.js';
import type { Account } from '../../core/types/domain.js';

export async function fetchAllAccounts(): Promise<Account[]> {
  return getAccounts();
}
