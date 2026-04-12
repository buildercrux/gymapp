import { z } from "zod";

const numberFromString = (schema) =>
  z.preprocess((value) => {
    if (value === "" || value === null || typeof value === "undefined") return undefined;
    return typeof value === "string" ? Number(value) : value;
  }, schema);

const requiredMoney = numberFromString(z.number().min(0));
const requiredDays = numberFromString(z.number().int().min(1).max(3650));
const optionalDays = numberFromString(z.number().int().min(0).max(365).optional());
const optionalInt = numberFromString(z.number().int().optional());

const optionalDate = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}, z.date().optional());

export const adminUpdateSettingsSchema = z.object({
  body: z.object({
    welcomeOfferEnabled: z.boolean().optional(),
    welcomeOfferType: z.enum(["percent", "amount"]).optional(),
    welcomeOfferValue: numberFromString(z.number().min(0)).optional(),
    welcomeOfferAllowTrial: z.boolean().optional(),
    welcomeOfferMessage: z.string().trim().max(240).optional().or(z.literal("")),
    welcomeOfferExpiresAt: optionalDate,
    renewalReminderDays: numberFromString(z.number().int().min(0).max(365)).optional(),
    trialEnabled: z.boolean().optional(),
    trialDays: numberFromString(z.number().int().min(0).max(365)).optional(),
    trialPayLaterEnabled: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const startTrialSchema = z.object({
  body: z.object({
    planId: z.string().min(1),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const payNowSchema = z.object({
  body: z.object({
    planId: z.string().min(1),
    couponCode: z.string().trim().max(30).optional().or(z.literal("")),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const previewPaymentSchema = z.object({
  body: z.object({
    planId: z.string().min(1),
    couponCode: z.string().trim().max(30).optional().or(z.literal("")),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const adminCreatePlanSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(60),
    description: z.string().trim().max(240).optional().or(z.literal("")),
    currency: z.string().trim().max(6).optional().or(z.literal("")),
    price: requiredMoney,
    durationDays: requiredDays,
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: optionalInt,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const adminUpdatePlanSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(60).optional(),
    description: z.string().trim().max(240).optional().or(z.literal("")),
    currency: z.string().trim().max(6).optional().or(z.literal("")),
    price: requiredMoney.optional(),
    durationDays: requiredDays.optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: optionalInt,
  }),
  params: z.object({ planId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const adminPlanIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ planId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const adminCreateCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(3).max(30),
    type: z.enum(["percent", "amount"]),
    value: numberFromString(z.number().min(1)),
    bonusDays: optionalDays,
    maxUses: numberFromString(z.number().int().min(1).optional()),
    expiresAt: optionalDate,
    isActive: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const adminUpdateCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(3).max(30).optional(),
    type: z.enum(["percent", "amount"]).optional(),
    value: numberFromString(z.number().min(1)).optional(),
    bonusDays: optionalDays,
    maxUses: numberFromString(z.number().int().min(1).optional()),
    expiresAt: optionalDate,
    isActive: z.boolean().optional(),
  }),
  params: z.object({ couponId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const adminCouponIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ couponId: z.string().min(1) }),
  query: z.object({}).optional(),
});
