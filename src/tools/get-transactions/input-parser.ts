// Parses and validates input arguments for get-transactions tool

import { GetTransactionsArgs } from '../../types.js';

export class GetTransactionsInputParser {
  parse(args: unknown): GetTransactionsArgs {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }
    const argsObj = args as Record<string, unknown>;
    const {
      accountId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      categoryId,
      categoryName,
      payeeName,
      notes,
      uncategorized,
      includePayeeHistory,
      limit,
      offset,
    } = argsObj;
    return {
      accountId: typeof accountId === 'string' ? accountId : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      minAmount: typeof minAmount === 'number' ? minAmount : undefined,
      maxAmount: typeof maxAmount === 'number' ? maxAmount : undefined,
      categoryId: typeof categoryId === 'string' && categoryId ? categoryId : undefined,
      categoryName: typeof categoryName === 'string' && categoryName ? categoryName : undefined,
      payeeName: typeof payeeName === 'string' && payeeName ? payeeName : undefined,
      notes: typeof notes === 'string' && notes ? notes : undefined,
      uncategorized: uncategorized === true ? true : undefined,
      includePayeeHistory: includePayeeHistory === true ? true : undefined,
      // Reason: check >= 1 before flooring, or a value like 0.5 would become LIMIT 0.
      limit: typeof limit === 'number' && limit >= 1 ? Math.floor(limit) : undefined,
      offset: typeof offset === 'number' && offset > 0 ? Math.floor(offset) : undefined,
    };
  }
}
