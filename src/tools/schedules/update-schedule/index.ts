// ----------------------------
// UPDATE SCHEDULE TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { updateSchedule } from '../../../actual-api.js';

export const schema = {
  name: 'update-schedule',
  description: 'Update an existing schedule',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'ID of the schedule. Should be in UUID format.',
      },
      name: {
        type: 'string',
        description: 'New name for the schedule',
      },
      posts_transaction: {
        type: 'boolean',
        description: 'Whether the schedule automatically posts a transaction',
      },
      next_date: {
        type: 'string',
        description: 'Next date the schedule runs (YYYY-MM-DD)',
      },
      completed: {
        type: 'boolean',
        description: 'Whether the schedule is completed/archived',
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
      resetNextDate: {
        type: 'boolean',
        description: 'Whether to reset the next date based on the recurrence rule',
      },
    },
    required: ['id'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.id || typeof args.id !== 'string') {
      return errorFromCatch('id is required and must be a string');
    }

    const fields: Record<string, unknown> = {};
    if (args.name !== undefined) fields.name = args.name;
    if (args.posts_transaction !== undefined) fields.posts_transaction = args.posts_transaction;
    if (args.next_date !== undefined) fields.next_date = args.next_date;
    if (args.completed !== undefined) fields.completed = args.completed;
    if (args.payee !== undefined) fields.payee = args.payee;
    if (args.account !== undefined) fields.account = args.account;
    if (args.amount !== undefined) fields.amount = args.amount;
    if (args.amountOp !== undefined) fields.amountOp = args.amountOp;
    if (args.date !== undefined) fields.date = args.date;

    if (Object.keys(fields).length === 0) {
      return errorFromCatch('at least one field to update must be provided');
    }

    const resetNextDate = args.resetNextDate !== undefined ? (args.resetNextDate as boolean) : undefined;

    await updateSchedule(args.id, fields as Parameters<typeof updateSchedule>[1], resetNextDate);

    return successWithJson('Successfully updated schedule ' + args.id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
