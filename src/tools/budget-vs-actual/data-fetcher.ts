// Fetches per-month budget figures for budget-vs-actual tool
import { getBudgetMonth, getBudgetMonths } from '../../actual-api.js';
import type { BudgetMonth } from '../../types.js';

export class BudgetVsActualDataFetcher {
  /**
   * Fetch budget data for each requested month.
   *
   * Months the budget has no data for are reported separately rather than
   * throwing, so a request for more months than the file covers still returns
   * the months that do exist.
   */
  async fetchMonths(requested: string[]): Promise<{ budgetMonths: BudgetMonth[]; missingMonths: string[] }> {
    const available = new Set(await getBudgetMonths());
    const present = requested.filter((month) => available.has(month));
    const missingMonths = requested.filter((month) => !available.has(month));

    const budgetMonths = await Promise.all(present.map((month) => getBudgetMonth(month)));

    return { budgetMonths, missingMonths };
  }
}
