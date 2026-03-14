// ----------------------------
// GET SCHEDULES TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getSchedules } from '../../../actual-api.js';

export const schema = {
  name: 'get-schedules',
  description: 'Retrieve a list of all schedules with their id, name, date, amount, payee, account, and status.',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const schedules = await getSchedules();

    const structured = schedules.map((s) => ({
      id: s.id,
      name: s.name || null,
      posts_transaction: s.posts_transaction,
      next_date: s.next_date || null,
      completed: s.completed ?? false,
      payee: s.payee || null,
      account: s.account || null,
      amount: s.amount ?? null,
      amountOp: s.amountOp,
      date: s.date,
      rule: s.rule || null,
    }));

    return successWithJson(structured);
  } catch (err) {
    return errorFromCatch(err);
  }
}
