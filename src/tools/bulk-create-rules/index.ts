import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { success, errorFromCatch } from '../../utils/response.js';
import { createRule } from '../../actual-api.js';
import { BulkCreateRulesArgsSchema, type BulkCreateRulesArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'bulk-create-rules',
  description:
    'Create multiple rules in a single operation. Each rule must include stage, conditionsOp, conditions, and actions. Returns a summary of successful creations and any errors.',
  inputSchema: toJSONSchema(BulkCreateRulesArgsSchema) as ToolInput,
};

export async function handler(args: BulkCreateRulesArgs): Promise<CallToolResult> {
  try {
    const { rules } = BulkCreateRulesArgsSchema.parse(args);

    let created = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < rules.length; i++) {
      try {
        await createRule(rules[i] as Record<string, unknown>);
        created++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ index: i, message });
      }
    }

    const errorWord = errors.length === 1 ? 'error' : 'errors';
    let summary = `Bulk create complete: ${created} created, ${errors.length} ${errorWord}`;

    if (errors.length > 0) {
      summary += '\n\nErrors:\n' + errors.map((e) => `- Rule ${e.index}: ${e.message}`).join('\n');
    }

    return success(summary);
  } catch (err) {
    return errorFromCatch(err);
  }
}
