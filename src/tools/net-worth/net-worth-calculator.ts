// Rolls per-account balances up into monthly net worth for net-worth tool
import type { AccountBalanceAtMonth, NetWorthMonth } from './types.js';

export class NetWorthCalculator {
  calculate(months: string[], balancesByMonth: Map<string, AccountBalanceAtMonth[]>): NetWorthMonth[] {
    const rows: NetWorthMonth[] = months.map((month) => {
      const accounts = balancesByMonth.get(month) ?? [];
      const assets = accounts.filter((a) => a.balance > 0).reduce((sum, a) => sum + a.balance, 0);
      // Reason: liabilities are stored as negative balances; report them as a positive magnitude.
      const liabilities = accounts.filter((a) => a.balance < 0).reduce((sum, a) => sum - a.balance, 0);

      return { month, assets, liabilities, netWorth: assets - liabilities, accounts };
    });

    for (let i = 1; i < rows.length; i++) {
      rows[i].change = rows[i].netWorth - rows[i - 1].netWorth;
    }

    return rows;
  }
}
