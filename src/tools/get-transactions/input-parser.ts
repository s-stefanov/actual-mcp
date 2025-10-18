// Parses and validates input arguments for get-transactions tool

import { GetTransactionsArgs } from '../../types.js';

export class GetTransactionsInputParser {
  parse(args: unknown): GetTransactionsArgs {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }
    const argsObj = args as Record<string, unknown>;
    const { accountId, startDate, endDate, minAmount, maxAmount, categoryName, payeeName, limit } = argsObj;
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('accountId is required and must be a string');
    }
    return {
      accountId,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      minAmount: typeof minAmount === 'number' ? minAmount : undefined,
      maxAmount: typeof maxAmount === 'number' ? maxAmount : undefined,
      categoryName: typeof categoryName === 'string' ? categoryName : undefined,
      payeeName: typeof payeeName === 'string' ? payeeName : undefined,
      limit: typeof limit === 'number' ? limit : undefined,
    };
  }
}
