import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toJSONSchema } from 'zod';
import { ReceiptStore } from '../../receipts/store.js';
import { GetReceiptsInputSchema, RecordReceiptInputSchema, UpdateReceiptInputSchema } from '../../receipts/types.js';
import type { ToolInput } from '../../types.js';
import { errorFromCatch, successWithJson } from '../../utils/response.js';

export const recordReceipt = {
  requiresActualApi: false,
  schema: {
    name: 'record-receipt',
    description:
      'Record structured receipt extraction in the durable queue. Requires a caller-generated intakeId UUID; amounts are integer cents; image bytes and paths are not accepted.',
    inputSchema: toJSONSchema(RecordReceiptInputSchema) as ToolInput,
  },
  async handler(args: unknown): Promise<CallToolResult> {
    try {
      const input = RecordReceiptInputSchema.parse(args);
      const result = await new ReceiptStore().record(input);
      return successWithJson({ receiptId: result.receipt.id, ...result });
    } catch (error) {
      return errorFromCatch(error);
    }
  },
};

export const getReceipts = {
  requiresActualApi: false,
  schema: {
    name: 'get-receipts',
    description: 'List queued receipts by lifecycle status. Defaults to pending receipts.',
    inputSchema: toJSONSchema(GetReceiptsInputSchema) as ToolInput,
  },
  async handler(args: unknown): Promise<CallToolResult> {
    try {
      const { status } = GetReceiptsInputSchema.parse(args ?? {});
      return successWithJson({ receipts: await new ReceiptStore().list(status) });
    } catch (error) {
      return errorFromCatch(error);
    }
  },
};

export const updateReceipt = {
  requiresActualApi: false,
  schema: {
    name: 'update-receipt',
    description:
      'Update receipt lifecycle state. Matching requires a transaction ID; needs-review requires a reason; matched and expired are terminal.',
    inputSchema: toJSONSchema(UpdateReceiptInputSchema) as ToolInput,
  },
  async handler(args: unknown): Promise<CallToolResult> {
    try {
      const input = UpdateReceiptInputSchema.parse(args);
      return successWithJson({ receipt: await new ReceiptStore().update(input) });
    } catch (error) {
      return errorFromCatch(error);
    }
  },
};
