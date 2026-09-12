// Parses and normalizes arguments for category-trends tool
import { CategoryTrendsArgsSchema, type CategoryTrendsArgs } from '../../types.js';

export class CategoryTrendsInputParser {
  parse(args: unknown): CategoryTrendsArgs & { months: number; includeIncome: boolean } {
    const parsed = CategoryTrendsArgsSchema.parse(args ?? {});
    if (parsed.months <= 0) {
      throw new Error('months must be a positive number');
    }
    return parsed;
  }
}
