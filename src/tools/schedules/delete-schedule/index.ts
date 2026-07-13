import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { success, errorFromCatch } from '../../../utils/response.js';
import { deleteSchedule } from '../../../actual-api.js';
import { ToolInput } from '../../../types.js';

const DeleteScheduleArgsSchema = z.object({
  id: z.string().describe('Required. The ID of the schedule to delete'),
});

type DeleteScheduleArgs = z.infer<typeof DeleteScheduleArgsSchema>;

export const schema = {
  name: 'delete-schedule',
  description: 'Delete a schedule (recurring transaction) by ID.',
  inputSchema: zodToJsonSchema(DeleteScheduleArgsSchema) as ToolInput,
};

export async function handler(args: DeleteScheduleArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = DeleteScheduleArgsSchema.parse(args);
    await deleteSchedule(validatedArgs.id);
    return success(`Successfully deleted schedule ${validatedArgs.id}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}
