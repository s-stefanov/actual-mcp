// Parses and normalizes arguments for spending-by-payee tool
import { SpendingByPayeeArgsSchema, type SpendingByPayeeArgs } from '../../types.js';

export class SpendingByPayeeInputParser {
  parse(args: unknown): SpendingByPayeeArgs & { limit: number; includeIncome: boolean } {
    const parsed = SpendingByPayeeArgsSchema.parse(args ?? {});
    if (parsed.limit <= 0) {
      throw new Error('limit must be a positive number');
    }
    return parsed;
  }
}
