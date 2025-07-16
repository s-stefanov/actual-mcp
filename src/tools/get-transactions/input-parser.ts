// Parses and validates input arguments for get-transactions tool

export interface GetTransactionsInput {
  accountId: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  category?: string;
  payee?: string;
  limit?: number;
}

export class GetTransactionsInputParser {
  parse(args: any): GetTransactionsInput {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }
    const { accountId, startDate, endDate, minAmount, maxAmount, category, payee, limit } = args;
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('accountId is required and must be a string');
    }
    return {
      accountId,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      minAmount: typeof minAmount === 'number' ? minAmount : undefined,
      maxAmount: typeof maxAmount === 'number' ? maxAmount : undefined,
      category: typeof category === 'string' ? category : undefined,
      payee: typeof payee === 'string' ? payee : undefined,
      limit: typeof limit === 'number' ? limit : undefined,
    };
  }
}
