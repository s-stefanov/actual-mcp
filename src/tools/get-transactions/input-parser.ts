// Parses and validates input arguments for get-transactions tool

import { GetTransactionsArgs } from '../../types.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate that a value is either undefined or a well-formed YYYY-MM-DD date string.
 *
 * @param value - The raw argument value to check
 * @param field - The field name used in error messages
 * @returns The validated date string, or undefined if not provided
 */
function parseDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new Error(`${field} must be a string in YYYY-MM-DD format`);
  }
  return value;
}

export class GetTransactionsInputParser {
  parse(args: unknown): GetTransactionsArgs {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }
    const argsObj = args as Record<string, unknown>;
    const { accountId, startDate, endDate, minAmount, maxAmount, categoryName, uncategorized, payeeName, limit } =
      argsObj;
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('accountId is required and must be a string');
    }

    const parsedStartDate = parseDate(startDate, 'startDate');
    const parsedEndDate = parseDate(endDate, 'endDate');

    // # Reason: An inverted range would silently return no transactions, so fail fast instead.
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      throw new Error('startDate must be on or before endDate');
    }

    return {
      accountId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      minAmount: typeof minAmount === 'number' ? minAmount : undefined,
      maxAmount: typeof maxAmount === 'number' ? maxAmount : undefined,
      categoryName: typeof categoryName === 'string' ? categoryName : undefined,
      uncategorized: typeof uncategorized === 'boolean' ? uncategorized : undefined,
      payeeName: typeof payeeName === 'string' ? payeeName : undefined,
      limit: typeof limit === 'number' ? limit : undefined,
    };
  }
}
