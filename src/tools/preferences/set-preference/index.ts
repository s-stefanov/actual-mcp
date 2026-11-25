// ----------------------------
// SET PREFERENCE TOOL
// ----------------------------

import { setPreference } from '../../../actual-automation-api.js';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';

export const schema = {
  name: 'set-preference',
  description:
    'Set one of the budget\'s synced preferences. For example, key "learn-categories" with value "false" stops ' +
    'Actual from creating or rewriting category rules when transactions are categorised. Values are strings.',
  inputSchema: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Preference name, as listed by get-preferences (e.g. "learn-categories").' },
      value: { type: 'string', description: 'New value as a string (e.g. "false").' },
    },
    required: ['key', 'value'],
    additionalProperties: false,
  },
};

/**
 * Sets a synced preference.
 *
 * @param args - `key` and `value`
 * @returns A success message, or an error response
 */
export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (typeof args.key !== 'string' || !args.key) {
      return errorFromCatch('key is required and must be a string');
    }
    if (typeof args.value !== 'string') {
      return errorFromCatch('value is required and must be a string');
    }

    await setPreference(args.key as keyof SyncedPrefs, args.value);

    return successWithJson(`Set preference ${args.key} to "${args.value}"`);
  } catch (err) {
    return errorFromCatch(err);
  }
}
