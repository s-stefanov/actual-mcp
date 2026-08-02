import { z } from 'zod';

export const MAX_QUEUE_BYTES = 10 * 1024 * 1024;
export const MAX_RECEIPTS = 10_000;
export const MAX_AMOUNT_CENTS = 1_000_000_000;

export const ReceiptStatusSchema = z.enum(['pending', 'matched', 'needs-review', 'expired']);
export type ReceiptStatus = z.infer<typeof ReceiptStatusSchema>;

const boundedString = (maximum: number): z.ZodString => z.string().trim().min(1).max(maximum);
const integerCents = z.number().int().safe().min(-MAX_AMOUNT_CENTS).max(MAX_AMOUNT_CENTS);
const purchaseDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'purchaseDate must use YYYY-MM-DD')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, 'purchaseDate must be valid');

export const ReceiptLineGroupSchema = z
  .object({
    description: boundedString(200),
    category: boundedString(200),
    amount: integerCents,
  })
  .strict();

export const RecordReceiptInputSchema = z
  .object({
    intakeId: z.string().uuid(),
    merchant: boundedString(200),
    purchaseDate,
    total: integerCents.positive(),
    accountHint: boundedString(100).optional(),
    lineGroups: z.array(ReceiptLineGroupSchema).min(1).max(100),
    tax: integerCents.nonnegative().optional(),
    discount: integerCents.nonnegative().optional(),
    notes: boundedString(2000).optional(),
  })
  .strict();

export const GetReceiptsInputSchema = z
  .object({
    status: ReceiptStatusSchema.optional().default('pending'),
  })
  .strict();

export const UpdateReceiptInputSchema = z
  .object({
    id: z.string().uuid(),
    status: ReceiptStatusSchema,
    matchedTransactionId: boundedString(200).optional(),
    reason: boundedString(2000).optional(),
  })
  .strict();

const StoredReceiptSchema = RecordReceiptInputSchema.extend({
  id: z.string().uuid(),
  status: ReceiptStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  matchedTransactionId: boundedString(200).optional(),
  matchedAt: z.iso.datetime().optional(),
  reviewReason: boundedString(2000).optional(),
})
  .strict()
  .superRefine((receipt, context) => {
    const lineTotal = receipt.lineGroups.reduce((sum, line) => sum + BigInt(line.amount), 0n);
    if (lineTotal !== BigInt(receipt.total)) {
      context.addIssue({
        code: 'custom',
        message: 'Line group amounts must sum exactly to total',
        path: ['lineGroups'],
      });
    }

    const hasMatchMetadata = receipt.matchedTransactionId !== undefined || receipt.matchedAt !== undefined;
    if (receipt.status === 'matched') {
      if (
        receipt.matchedTransactionId === undefined ||
        receipt.matchedAt === undefined ||
        receipt.reviewReason !== undefined
      ) {
        context.addIssue({ code: 'custom', message: 'Invalid metadata for matched receipt', path: ['status'] });
      }
    } else if (receipt.status === 'needs-review') {
      if (receipt.reviewReason === undefined || hasMatchMetadata) {
        context.addIssue({ code: 'custom', message: 'Invalid metadata for needs-review receipt', path: ['status'] });
      }
    } else if (hasMatchMetadata || receipt.reviewReason !== undefined) {
      context.addIssue({ code: 'custom', message: `Invalid metadata for ${receipt.status} receipt`, path: ['status'] });
    }

    const created = Date.parse(receipt.createdAt);
    const updated = Date.parse(receipt.updatedAt);
    if (updated < created) {
      context.addIssue({ code: 'custom', message: 'updatedAt cannot precede createdAt', path: ['updatedAt'] });
    }
    if (receipt.matchedAt !== undefined) {
      const matched = Date.parse(receipt.matchedAt);
      if (matched < created || matched > updated) {
        context.addIssue({
          code: 'custom',
          message: 'matchedAt must be between createdAt and updatedAt',
          path: ['matchedAt'],
        });
      }
    }
  });

export const ReceiptArraySchema = z.array(StoredReceiptSchema).max(MAX_RECEIPTS);
export type Receipt = z.infer<typeof StoredReceiptSchema>;
export type ReceiptLineGroup = z.infer<typeof ReceiptLineGroupSchema>;
export type RecordReceiptInput = z.input<typeof RecordReceiptInputSchema>;
export type UpdateReceiptInput = z.input<typeof UpdateReceiptInputSchema>;

export interface RecordReceiptResult {
  receipt: Receipt;
  duplicate: boolean;
}
