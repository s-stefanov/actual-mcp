// ----------------------------
// APPLY BUDGET TEMPLATES TOOL
// ----------------------------

import { applyBudgetTemplates } from '../../../actual-automation-api.js';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { toTemplateResult } from '../template-result.js';

export const schema = {
  name: 'apply-budget-templates',
  description:
    'Fill a month\'s budget from the "#template" lines in category notes, like the UI\'s "Apply budget template". ' +
    'By default only categories with nothing budgeted yet are filled; overwrite replaces existing amounts; ' +
    'categoryIds limits it to those categories (and always overwrites them).',
  inputSchema: {
    type: 'object',
    properties: {
      month: { type: 'string', pattern: '^\\d{4}-\\d{2}$', description: 'Month in YYYY-MM format.' },
      overwrite: { type: 'boolean', description: 'Replace amounts that are already budgeted. Default false.' },
      categoryIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Only apply the templates of these categories.',
      },
    },
    required: ['month'],
    additionalProperties: false,
  },
};

/**
 * Applies budget templates for a month.
 *
 * @param args - `month`, optional `overwrite` and `categoryIds`
 * @returns { ok, status, errors, applied }: how many categories were budgeted; or an error response
 */
export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    if (typeof args.month !== 'string' || !/^\d{4}-\d{2}$/.test(args.month)) {
      return errorFromCatch('month is required in YYYY-MM format');
    }
    if (args.overwrite !== undefined && typeof args.overwrite !== 'boolean') {
      return errorFromCatch('overwrite must be a boolean');
    }
    if (
      args.categoryIds !== undefined &&
      (!Array.isArray(args.categoryIds) ||
        args.categoryIds.length === 0 ||
        !args.categoryIds.every((id) => typeof id === 'string' && id))
    ) {
      return errorFromCatch('categoryIds must be a non-empty array of category IDs (omit it for every category)');
    }

    const result = await applyBudgetTemplates(args.month, {
      overwrite: args.overwrite === true,
      categoryIds: args.categoryIds as string[] | undefined,
    });

    return successWithJson(toTemplateResult(result));
  } catch (err) {
    return errorFromCatch(err);
  }
}
