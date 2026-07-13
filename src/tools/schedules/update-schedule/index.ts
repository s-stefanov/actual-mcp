import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { success, errorFromCatch } from '../../../utils/response.js';
import { updateSchedule } from '../../../actual-api.js';
import { ToolInput } from '../../../types.js';
import { ScheduleDateSchema, ScheduleAmountSchema } from '../common.js';

const UpdateScheduleArgsSchema = z.object({
  id: z.string().describe('Required. The ID of the schedule to update'),
  name: z.string().optional(),
  account: z.string().optional().describe('Account ID'),
  payee: z.string().optional().describe('Payee ID'),
  amount: ScheduleAmountSchema.optional(),
  amountOp: z.enum(['is', 'isapprox', 'isbetween']).optional(),
  date: ScheduleDateSchema.optional(),
  posts_transaction: z.boolean().optional(),
  completed: z.boolean().optional(),
  resetNextDate: z
    .boolean()
    .optional()
    .describe('If true, recompute next_date from the (possibly updated) recurrence config'),
});

type UpdateScheduleArgs = z.infer<typeof UpdateScheduleArgsSchema>;

export const schema = {
  name: 'update-schedule',
  description: 'Update an existing schedule (recurring transaction). Only provided fields are changed.',
  inputSchema: zodToJsonSchema(UpdateScheduleArgsSchema) as ToolInput,
};

export async function handler(args: UpdateScheduleArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = UpdateScheduleArgsSchema.parse(args);
    const { id, resetNextDate, ...fields } = validatedArgs;

    const filteredFields = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

    if (Object.keys(filteredFields).length === 0 && resetNextDate === undefined) {
      return errorFromCatch(new Error('No fields provided to update. Please specify at least one field to modify.'));
    }

    await updateSchedule(id, filteredFields, resetNextDate);
    const updatedFields = Object.keys(filteredFields).join(', ') || '(next_date reset only)';
    return success(`Successfully updated schedule ${id}. Updated fields: ${updatedFields}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}
