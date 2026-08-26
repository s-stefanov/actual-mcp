// Parses and normalizes arguments for budget-vs-actual tool
import { BudgetVsActualArgsSchema, type BudgetVsActualArgs } from '../../types.js';

export class BudgetVsActualInputParser {
  parse(args: unknown): Required<Pick<BudgetVsActualArgs, 'months' | 'includeHidden'>> & {
    categoryGroupName?: string;
  } {
    const parsed = BudgetVsActualArgsSchema.parse(args ?? {});
    if (parsed.months <= 0) {
      throw new Error('months must be a positive number');
    }
    return {
      months: parsed.months,
      includeHidden: parsed.includeHidden,
      categoryGroupName: parsed.categoryGroupName,
    };
  }
}
