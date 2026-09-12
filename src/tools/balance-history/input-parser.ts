// Parses and validates input arguments for balance-history tool

import { BalanceHistoryArgsSchema } from '../../types.js';

export interface BalanceHistoryInput {
  accountId?: string;
  includeOffBudget: boolean;
  months: number;
}

export class BalanceHistoryInputParser {
  parse(args: unknown): BalanceHistoryInput {
    return BalanceHistoryArgsSchema.parse(args);
  }
}
