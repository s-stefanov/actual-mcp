// Parses and validates input arguments for balance-history tool

import { BalanceHistoryArgs } from '../../types.js';

export interface BalanceHistoryInput {
  accountId: string;
  includeOffBudget: boolean;
  months: number;
}

export class BalanceHistoryInputParser {
  parse(args: BalanceHistoryArgs): BalanceHistoryInput {
    const { accountId, includeOffBudget, months } = args;
    return {
      accountId,
      includeOffBudget: typeof includeOffBudget === 'boolean' ? includeOffBudget : false,
      months: typeof months === 'number' && months > 0 ? months : 12,
    };
  }
}
