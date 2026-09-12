// Buckets transactions into periods and totals inflow/outflow for cash-flow tool
import { formatMonthLabel } from '../../utils.js';
import type { Transaction } from '../../core/types/domain.js';
import type { CashFlowPeriod } from './types.js';

export class CashFlowCalculator {
  calculate(transactions: Transaction[], interval: 'monthly' | 'weekly'): CashFlowPeriod[] {
    const buckets = new Map<string, CashFlowPeriod>();

    // Reason: transfers move money between the user's own accounts, so counting
    // them would inflate both income and expenses without changing net position.
    transactions
      .filter((transaction) => !transaction.transfer_id)
      .forEach((transaction) => {
        const key = interval === 'monthly' ? transaction.date.slice(0, 7) : this.weekKey(transaction.date);

        const bucket = buckets.get(key) ?? {
          key,
          label: interval === 'monthly' ? formatMonthLabel(key) : `Week of ${key}`,
          income: 0,
          expenses: 0,
          net: 0,
          runningNet: 0,
          transactions: 0,
        };

        if (transaction.amount > 0) {
          bucket.income += transaction.amount;
        } else {
          bucket.expenses += Math.abs(transaction.amount);
        }
        bucket.transactions += 1;
        buckets.set(key, bucket);
      });

    const periods = [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));

    let runningNet = 0;
    periods.forEach((period) => {
      period.net = period.income - period.expenses;
      runningNet += period.net;
      period.runningNet = runningNet;
    });

    return periods;
  }

  /** Monday-anchored week key, as `YYYY-MM-DD`. */
  private weekKey(date: string): string {
    const d = new Date(`${date}T00:00:00`);
    const dayOfWeek = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dayOfWeek);
    return d.toISOString().slice(0, 10);
  }
}
