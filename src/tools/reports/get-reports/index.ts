// ----------------------------
// GET REPORTS TOOL
// ----------------------------

import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getReports } from '../../../actual-api.js';
import { CustomReportEntity } from '@actual-app/core/types/models';

export const schema = {
  name: 'get-reports',
  description: "Retrieve every saved custom report from the budget's Reports page",
  inputSchema: {
    type: 'object',
    description: 'This tool does not accept any arguments.',
    properties: {},
    additionalProperties: false,
  },
};

export async function handler(): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const reports: CustomReportEntity[] = await getReports();

    return successWithJson(reports);
  } catch (err) {
    return errorFromCatch(err);
  }
}
