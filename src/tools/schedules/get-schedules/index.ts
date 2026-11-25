// ----------------------------
// GET SCHEDULES TOOL
// ----------------------------

import { getSchedules } from '../../../actual-automation-api.js';
import { getAccounts, getPayees } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';

export const schema = {
  name: 'get-schedules',
  description:
    'List schedules (recurring and one-off bills) with their payee, account, amount, recurrence and next date. ' +
    'Amounts are integer cents: negative for payments, positive for deposits.',
  inputSchema: {
    type: 'object',
    properties: {
      includeCompleted: {
        type: 'boolean',
        description: 'Also list completed schedules. Default false.',
      },
    },
    additionalProperties: false,
  },
};

/**
 * Lists schedules with payee and account names resolved.
 *
 * @param args - Tool arguments; `includeCompleted` also lists completed schedules
 * @returns The schedules as JSON, or an error response
 */
export async function handler(
  args: Record<string, unknown> = {}
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const [schedules, payees, accounts] = await Promise.all([getSchedules(), getPayees(), getAccounts()]);
    const payeeNames = new Map(payees.map((p) => [p.id, p.name]));
    const accountNames = new Map(accounts.map((a) => [a.id, a.name]));

    const result = schedules
      .filter((s) => args.includeCompleted === true || !s.completed)
      .map((s) => ({
        ...s,
        payee_name: s.payee ? (payeeNames.get(s.payee) ?? null) : null,
        account_name: s.account ? (accountNames.get(s.account) ?? null) : null,
      }));

    return successWithJson(result);
  } catch (err) {
    return errorFromCatch(err);
  }
}
