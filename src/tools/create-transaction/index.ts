// ----------------------------
// CREATE TRANSACTION TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../utils/response.js';
import { createTransaction } from '../../actual-api.js';

// TODO: Find a way to strongly encourage categories
export const schema = {
  name: 'create-transaction',
  description: 'Create a new transaction. Use this to add transactions to accounts.',
  inputSchema: {
    type: 'object',
    properties: {
      account: {
        type: 'string',
        description: 'Required. The ID of the account this transaction belongs to',
      },
      date: {
        type: 'string',
        description: 'Required. Transaction date in YYYY-MM-DD format',
      },
      amount: {
        type: 'number',
        description:
          'Required. A currency amount as an integer representing the value without decimal places. For example, USD amount of $120.30 would be 12030',
      },
      payee: {
        type: 'string',
        description: 'An existing payee ID. This overrides payee_name if both are provided.',
      },
      payee_name: {
        type: 'string',
        description:
          'If given, a payee will be created with this name. If this matches an already existing payee, that payee will be used.',
      },
      imported_payee: {
        type: 'string',
        description:
          'This can be anything. Meant to represent the raw description when importing, allowing the user to see the original value',
      },
      category: {
        type: 'string',
        description: 'Recommended. The ID of the category to assign to this transaction',
      },
      notes: {
        type: 'string',
        description: 'Any additional notes for the transaction',
      },
      imported_id: {
        type: 'string',
        description: 'A unique id usually given by the bank, if importing. Use this to avoid duplicate transactions',
      },
      transfer_id: {
        type: 'string',
        description:
          'If a transfer, the id of the corresponding transaction in the other account. Only set this when importing',
      },
      cleared: {
        type: 'boolean',
        description: 'A flag indicating if the transaction has cleared or not',
      },
      subtransactions: {
        type: 'array',
        description:
          "An array of subtransactions for a split transaction. If amounts don't equal total amount, API call will succeed but error will show in app",
        items: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Required for subtransactions. A currency amount as an integer',
            },
            category: {
              type: 'string',
              description: 'The ID of the category for this subtransaction',
            },
            notes: {
              type: 'string',
              description: 'Any additional notes for this subtransaction',
            },
          },
          required: ['amount'],
        },
      },
    },
    required: ['account', 'date', 'amount'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    // Validate required fields
    if (!args.account || typeof args.account !== 'string') {
      return errorFromCatch('account is required and must be a string');
    }

    if (!args.date || typeof args.date !== 'string') {
      return errorFromCatch('date is required and must be a string');
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      return errorFromCatch('date must be in YYYY-MM-DD format');
    }

    if (args.amount === undefined || typeof args.amount !== 'number') {
      return errorFromCatch('amount is required and must be a number');
    }

    // Validate optional field types
    if (args.payee !== undefined && typeof args.payee !== 'string') {
      return errorFromCatch('payee must be a string');
    }

    if (args.payee_name !== undefined && typeof args.payee_name !== 'string') {
      return errorFromCatch('payee_name must be a string');
    }

    if (args.imported_payee !== undefined && typeof args.imported_payee !== 'string') {
      return errorFromCatch('imported_payee must be a string');
    }

    if (args.category !== undefined && typeof args.category !== 'string') {
      return errorFromCatch('category must be a string');
    }

    if (args.notes !== undefined && typeof args.notes !== 'string') {
      return errorFromCatch('notes must be a string');
    }

    if (args.imported_id !== undefined && typeof args.imported_id !== 'string') {
      return errorFromCatch('imported_id must be a string');
    }

    if (args.transfer_id !== undefined && typeof args.transfer_id !== 'string') {
      return errorFromCatch('transfer_id must be a string');
    }

    if (args.cleared !== undefined && typeof args.cleared !== 'boolean') {
      return errorFromCatch('cleared must be a boolean');
    }

    // Validate subtransactions structure if provided
    if (args.subtransactions !== undefined) {
      if (!Array.isArray(args.subtransactions)) {
        return errorFromCatch('subtransactions must be an array');
      }
      // Check each subtransaction has required amount field and valid types
      for (let i = 0; i < args.subtransactions.length; i++) {
        const sub = args.subtransactions[i] as Record<string, unknown>;
        if (typeof sub.amount !== 'number') {
          return errorFromCatch(`subtransaction at index ${i} must have an amount field of type number`);
        }
        if (sub.category !== undefined && typeof sub.category !== 'string') {
          return errorFromCatch(`subtransaction at index ${i} category must be a string`);
        }
        if (sub.notes !== undefined && typeof sub.notes !== 'string') {
          return errorFromCatch(`subtransaction at index ${i} notes must be a string`);
        }
      }
    }

    const accountId = args.account;
    const data: Record<string, unknown> = {
      date: args.date,
      amount: args.amount,
    };

    // Optional fields
    if (args.payee !== undefined) data.payee = args.payee;
    if (args.payee_name !== undefined) data.payee_name = args.payee_name;
    if (args.imported_payee !== undefined) data.imported_payee = args.imported_payee;
    if (args.category !== undefined) data.category = args.category;
    if (args.notes !== undefined) data.notes = args.notes;
    if (args.imported_id !== undefined) data.imported_id = args.imported_id;
    if (args.transfer_id !== undefined) data.transfer_id = args.transfer_id;
    if (args.cleared !== undefined) data.cleared = args.cleared;
    if (args.subtransactions !== undefined) data.subtransactions = args.subtransactions;

    const id: string = await createTransaction(accountId, data);

    return successWithJson('Successfully created transaction ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
