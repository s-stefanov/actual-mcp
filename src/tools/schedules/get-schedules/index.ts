import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { successWithJson, errorFromCatch } from '../../../utils/response.js';
import { getSchedules } from '../../../actual-api.js';
import { ToolInput } from '../../../types.js';

const GetSchedulesArgsSchema = z.object({});

export const schema = {
  name: 'get-schedules',
  description:
    'Get all schedules (recurring transactions). Returns each schedule with its recurrence config (date), next_date, amount, amountOp, account, payee, posts_transaction and completed status.',
  inputSchema: zodToJsonSchema(GetSchedulesArgsSchema) as ToolInput,
};

export async function handler(): Promise<CallToolResult> {
  try {
    const schedules = await getSchedules();
    return successWithJson(schedules);
  } catch (error) {
    return errorFromCatch(error);
  }
}
