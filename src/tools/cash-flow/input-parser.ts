// Parses and normalizes arguments for cash-flow tool
import { CashFlowArgsSchema, type CashFlowArgs } from '../../types.js';

export class CashFlowInputParser {
  parse(args: unknown): CashFlowArgs & { months: number; interval: 'monthly' | 'weekly' } {
    const parsed = CashFlowArgsSchema.parse(args ?? {});
    if (parsed.months <= 0) {
      throw new Error('months must be a positive number');
    }
    return parsed;
  }
}
