// ----------------------------
// CREATE CUSTOM REPORT TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { createReport } from '../../../actual-api.js';
import { CreateReportInputSchema } from '../input-schema.js';
import { CustomReportEntity } from '@actual-app/core/types/models';

export const schema = {
  name: 'create-custom-report',
  description: 'Create a saved custom report, selectable as a widget in the Reports section',
  inputSchema: CreateReportInputSchema,
};

export async function handler(
  args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const id = await createReport(args as unknown as CustomReportEntity);

    return successWithJson('Successfully created report ' + id);
  } catch (err) {
    return errorFromCatch(err);
  }
}
