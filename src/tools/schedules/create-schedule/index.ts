import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { success, errorFromCatch } from '../../../utils/response.js';
import { createSchedule } from '../../../actual-api.js';
import { ToolInput } from '../../../types.js';
import { ScheduleDateSchema, ScheduleAmountSchema } from '../common.js';

const CreateScheduleArgsSchema = z.object({
  name: z.string().optional().describe('Display name for the schedule'),
  account: z.string().describe('Required. The ID of the account the scheduled transaction posts to'),
  payee: z.string().optional().describe('Payee ID'),
  amount: ScheduleAmountSchema.optional(),
  amountOp: z
    .enum(['is', 'isapprox', 'isbetween'])
    .default('isapprox')
    .describe('How transactions are matched against the amount (default isapprox)'),
  date: ScheduleDateSchema,
  posts_transaction: z
    .boolean()
    .default(false)
    .describe('If true, Actual automatically enters the transaction when due'),
});

type CreateScheduleArgs = z.infer<typeof CreateScheduleArgsSchema>;

export const schema = {
  name: 'create-schedule',
  description:
    'Create a schedule (recurring transaction), e.g. a monthly bill or paycheck. The date can be a fixed date or a recurrence config ({start, frequency, interval, patterns, ...}).',
  inputSchema: zodToJsonSchema(CreateScheduleArgsSchema) as ToolInput,
};

export async function handler(args: CreateScheduleArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = CreateScheduleArgsSchema.parse(args);
    const id = await createSchedule(validatedArgs);
    return success(`Successfully created schedule ${id}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}
