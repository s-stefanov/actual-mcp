// ----------------------------
// GET PREFERENCES TOOL
// ----------------------------

import { getPreferences } from '../../../actual-automation-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';

export const schema = {
  name: 'get-preferences',
  description:
    'Read the budget\'s synced preferences, such as "learn-categories" (whether Actual rewrites category rules ' +
    'when you categorise transactions), number and date format, and currency.',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

/**
 * Returns the budget's synced preferences.
 *
 * @returns The preferences as JSON, or an error response
 */
export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    return successWithJson(await getPreferences());
  } catch (err) {
    return errorFromCatch(err);
  }
}
