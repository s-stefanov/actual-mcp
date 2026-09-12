import { getAccountBalance } from '../../actual-api.js';

export function fetchAccountBalanceAsOf(accountId: string, asOf: Date = new Date()): Promise<number> {
  return getAccountBalance(accountId, asOf);
}
