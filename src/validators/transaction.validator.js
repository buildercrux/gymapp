import { z } from "zod";

const objectIdText = z.string().trim().min(1);
const accountTypeText = z.enum(["income", "expense"]);
const categoryText = z.string().trim().min(1).max(60);

const decimalSchema = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  return typeof value === "string" ? Number(value) : value;
}, z.number().finite().min(0));

const optionalDateSchema = z.preprocess((value) => {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}, z.date().optional());

export const listTransactionsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    gymId: objectIdText,
    accountType: accountTypeText.optional(),
    category: categoryText.optional(),
    from: optionalDateSchema,
    to: optionalDateSchema,
  }),
});

export const createTransactionSchema = z.object({
  body: z.object({
    gymId: objectIdText,
    accountType: accountTypeText,
    category: categoryText,
    entityUserId: objectIdText.optional().or(z.literal("")),
    entityRole: z.enum(["member", "staff"]).optional().or(z.literal("")),
    entityName: z.string().trim().max(120).optional().or(z.literal("")),
    comment: z.string().trim().max(500).optional().or(z.literal("")),
    totalAmount: decimalSchema,
    paidAmount: decimalSchema,
    periodStart: optionalDateSchema,
    periodEnd: optionalDateSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateTransactionSchema = z.object({
  body: z.object({
    gymId: objectIdText,
    accountType: accountTypeText.optional(),
    category: categoryText.optional(),
    entityUserId: objectIdText.optional().or(z.literal("")),
    entityRole: z.enum(["member", "staff"]).optional().or(z.literal("")),
    entityName: z.string().trim().max(120).optional().or(z.literal("")),
    comment: z.string().trim().max(500).optional().or(z.literal("")),
    totalAmount: decimalSchema.optional(),
    paidAmount: decimalSchema.optional(),
    periodStart: optionalDateSchema,
    periodEnd: optionalDateSchema,
  }),
  params: z.object({ transactionId: objectIdText }),
  query: z.object({}).optional(),
});

export const transactionIdSchema = z.object({
  body: z.object({ gymId: objectIdText }),
  params: z.object({ transactionId: objectIdText }),
  query: z.object({}).optional(),
});
