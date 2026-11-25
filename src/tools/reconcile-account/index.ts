// ----------------------------
// RECONCILE ACCOUNT TOOL
// ----------------------------

import { reconcileAccount } from '../../actual-automation-api.js';
import { getAccounts } from '../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../utils/response.js';

export const schema = {
  name: 'reconcile-account',
  description:
    "Reconcile an account against a bank statement: compare the statement's closing balance with the account's " +
    "cleared balance on that date. When they match, lock those cleared transactions as reconciled, like the UI's " +
    'reconcile button. When they differ, report the difference and change nothing.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'Account ID (UUID).' },
      date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Statement closing date, YYYY-MM-DD.' },
      balance: {
        type: 'number',
        description: 'Statement closing balance in integer cents (e.g. 271878 = 2,718.78; negative for a debt).',
      },
      dryRun: { type: 'boolean', description: 'Only compare; never lock anything. Default false.' },
    },
    required: ['accountId', 'date', 'balance'],
    additionalProperties: false,
  },
};

/**
 * Compares the cleared balance with the statement and locks the matching transactions.
 *
 * @param args - `accountId`, `date`, `balance` and optional `dryRun`
 * @returns Balances, difference and how many transactions were locked, or an error response
 */
export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (typeof args.accountId !== 'string' || !args.accountId) {
      return errorFromCatch('accountId is required and must be a string');
    }
    if (typeof args.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      return errorFromCatch('date is required in YYYY-MM-DD format');
    }
    if (!Number.isInteger(args.balance)) {
      return errorFromCatch('balance is required as an integer number of cents');
    }

    const accountId = args.accountId;
    if (!(await getAccounts()).some((a) => a.id === accountId)) {
      return errorFromCatch(`Account ${accountId} does not exist`);
    }

    const statementBalance = args.balance as number;
    const { clearedBalance, locked } = await reconcileAccount(
      accountId,
      args.date,
      statementBalance,
      args.dryRun === true
    );
    const difference = statementBalance - clearedBalance;

    if (locked === null) {
      return successWithJson({
        reconciled: false,
        clearedBalance,
        statementBalance,
        difference,
        message:
          difference === 0
            ? 'Balances match (dry run, nothing locked).'
            : 'Balances differ: find the missing, extra or uncleared transactions before reconciling. Nothing was locked.',
      });
    }

    return successWithJson({
      reconciled: true,
      clearedBalance,
      statementBalance,
      difference,
      lockedTransactions: locked,
    });
  } catch (err) {
    return errorFromCatch(err);
  }
}
