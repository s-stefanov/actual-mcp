// ----------------------------
// CHECK BUDGET TEMPLATES TOOL
// ----------------------------

import { checkBudgetTemplates } from '../../../actual-automation-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { toTemplateResult } from '../template-result.js';

export const schema = {
  name: 'check-budget-templates',
  description:
    'Check every "#template" line in category notes and report the invalid ones, ' +
    'including templates that name a schedule that does not exist. Changes nothing. Returns {ok, status, errors}.',
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

/**
 * Runs Actual's template check.
 *
 * @returns { ok, status, errors }: ok is true when every template is valid; or an error response
 */
export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    return successWithJson(toTemplateResult(await checkBudgetTemplates()));
  } catch (err) {
    return errorFromCatch(err);
  }
}
