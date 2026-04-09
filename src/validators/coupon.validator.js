import { z } from "zod";

const objectIdText = z.string().trim().min(1);

const couponCodeText = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid coupon code")
  .transform((value) => value.toUpperCase());

const couponTypeText = z.enum(["percent", "amount"]);

const requiredPositiveNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  return typeof value === "string" ? Number(value) : value;
}, z.number().positive());

const optionalPositiveInt = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  return typeof value === "string" ? Number(value) : value;
}, z.number().int().positive().max(100000).optional());

const optionalDate = z.preprocess((value) => {
  if (!value) return undefined;
  const dateValue = new Date(String(value));
  return Number.isNaN(dateValue.getTime()) ? value : dateValue;
}, z.date().optional());

const optionalBool = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  return value;
}, z.boolean().optional());

export const listCouponsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    gymId: objectIdText,
    planId: objectIdText.optional(),
    includeInactive: optionalBool,
  }),
});

export const createCouponSchema = z.object({
  body: z.object({
    gymId: objectIdText,
    planId: objectIdText,
    code: couponCodeText,
    type: couponTypeText,
    value: requiredPositiveNumber,
    maxUses: optionalPositiveInt,
    expiresAt: optionalDate,
    isActive: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateCouponSchema = z.object({
  body: z.object({
    gymId: objectIdText,
    code: couponCodeText.optional(),
    type: couponTypeText.optional(),
    value: requiredPositiveNumber.optional(),
    maxUses: optionalPositiveInt,
    expiresAt: optionalDate,
    isActive: z.boolean().optional(),
  }),
  params: z.object({ couponId: objectIdText }),
  query: z.object({}).optional(),
});

export const couponIdSchema = z.object({
  body: z.object({ gymId: objectIdText }),
  params: z.object({ couponId: objectIdText }),
  query: z.object({}).optional(),
});

export const validateCouponSchema = z.object({
  body: z.object({
    gymId: objectIdText,
    planId: objectIdText,
    couponCode: z.string().trim().max(20).optional().or(z.literal("")),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
