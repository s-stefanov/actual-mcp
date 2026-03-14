// ----------------------------
// CREATE SCHEDULE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { createSchedule } from '../../../actual-api.js';

export const schema = {
  name: 'create-schedule',
  description: 'Create a new schedule for a recurring transaction',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the schedule',
      },
      posts_transaction: {
        type: 'boolean',
        description: 'Whether the schedule automatically posts a transaction',
      },
      next_date: {
        type: 'string',
        description: 'Next date the schedule runs (YYYY-MM-DD)',
      },
      payee: {
        type: 'string',
        description: 'Payee ID for the scheduled transaction',
      },
      account: {
        type: 'string',
        description: 'Account ID for the scheduled transaction',
      },
      amount: {
        description: 'Amount of the transaction (in cents, negative for expenses)',
        oneOf: [{ type: 'number' }, { type: 'object' }],
      },
      amountOp: {
        type: 'string',
        description: 'Amount match operator: is, isapprox, or isbetween',
      },
      date: {
        description: 'Date or recurrence config for the schedule (YYYY-MM-DD or RecurConfig object)',
        oneOf: [{ type: 'string' }, { type: 'object' }],
      },
    },
    required: ['amountOp', 'date'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.amountOp || typeof args.amountOp !== 'string') {
      return errorFromCatch('amountOp is required and must be a string (is, isapprox, or isbetween)');
    }
    if (args.date === undefined || args.date === null) {
      return errorFromCatch('date is required');
    }

    const data: Record<string, unknown> = {
      amountOp: args.amountOp,
      date: args.date,
    };

    if (args.name !== undefined) data.name = args.name;
    if (args.posts_transaction !== undefined) data.posts_transaction = args.posts_transaction;
    if (args.next_date !== undefined) data.next_date = args.next_date;
    if (args.payee !== undefined) data.payee = args.payee;
    if (args.account !== undefined) data.account = args.account;
    if (args.amount !== undefined) data.amount = args.amount;

    const id: string = await createSchedule(data as Parameters<typeof createSchedule>[0]);

    return successWithJson('Successfully created schedule ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
