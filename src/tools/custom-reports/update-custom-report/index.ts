// ----------------------------
// UPDATE CUSTOM REPORT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getReports, updateReport } from '../../../actual-api.js';
import { UpdateReportInputSchema } from '../input-schema.js';
import { CustomReportEntity } from '@actual-app/core/types/models';

export const schema = {
  name: 'update-custom-report',
  description: 'Update fields on a saved custom report, leaving unspecified fields unchanged',
  inputSchema: UpdateReportInputSchema,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const { id, ...fields } = args as { id?: string } & Record<string, unknown>;
    if (!id) {
      throw new Error('id is required');
    }

    // Reason: the update handler rewrites the whole row, so a partial payload
    // would blank every field the caller left out. Merge onto the saved report.
    const existing = (await getReports()).find((report) => report.id === id);
    if (!existing) {
      throw new Error(`Report not found: ${id}`);
    }

    await updateReport({ ...existing, ...fields } as CustomReportEntity);

    return successWithJson('Successfully updated report ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
