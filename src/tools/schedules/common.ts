// ----------------------------
// SHARED SCHEDULE SCHEMAS
// ----------------------------

import { z } from 'zod';

export const RecurPatternSchema = z.object({
  value: z.number(),
  type: z.enum(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'day']),
});

export const RecurConfigSchema = z.object({
  start: z.string().describe('Start date in YYYY-MM-DD format'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().optional().describe('Repeat every N frequency units (default 1)'),
  patterns: z.array(RecurPatternSchema).optional(),
  skipWeekend: z.boolean().optional(),
  weekendSolveMode: z.enum(['before', 'after']).optional(),
  endMode: z.enum(['never', 'after_n_occurrences', 'on_date']).optional(),
  endOccurrences: z.number().optional(),
  endDate: z.string().optional(),
});

export const ScheduleDateSchema = z
  .union([z.string(), RecurConfigSchema])
  .describe('Either a single date (YYYY-MM-DD) or a recurrence config object');

export const ScheduleAmountSchema = z
  .union([z.number(), z.object({ num1: z.number(), num2: z.number() })])
  .describe(
    'Amount as integer without decimal places (e.g. $120.30 = 12030, negative for expenses), or {num1, num2} range when amountOp is isbetween'
  );
