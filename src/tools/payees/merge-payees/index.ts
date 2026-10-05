// ----------------------------
// MERGE PAYEES TOOL
// ----------------------------

import { mergePayees } from '../../../actual-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';

export const schema = {
  name: 'merge-payees',
  description:
    'Merge one or more payees into a target payee. Transactions referencing the merged payees are reassigned to the target, and the merged payees are removed.',
  inputSchema: {
    type: 'object',
    properties: {
      targetId: {
        type: 'string',
        description: 'ID of the payee to keep. Should be in UUID format.',
      },
      mergeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'IDs of the payees to merge into the target. Should be in UUID format.',
      },
    },
    required: ['targetId', 'mergeIds'],
  },
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (!args.targetId || typeof args.targetId !== 'string') {
      return errorFromCatch('targetId is required and must be a string');
    }
    if (
      !Array.isArray(args.mergeIds) ||
      args.mergeIds.length === 0 ||
      !args.mergeIds.every((id) => typeof id === 'string' && id.length > 0)
    ) {
      return errorFromCatch('mergeIds is required and must be a non-empty array of strings');
    }

    const targetId = args.targetId;
    // Reason: merging a payee into itself would delete the target, so drop it defensively.
    const mergeIds = [...new Set(args.mergeIds as string[])].filter((id) => id !== targetId);
    if (mergeIds.length === 0) {
      return errorFromCatch('mergeIds must contain at least one payee other than targetId');
    }

    await mergePayees(targetId, mergeIds);

    return successWithJson(`Successfully merged ${mergeIds.length} payee(s) into ${targetId}`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
