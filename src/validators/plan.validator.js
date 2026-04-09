import { z } from "zod";

const durationKeys = ["1-day", "3-day", "weekly", "monthly", "3-months", "6-months", "9-months", "12-months", "custom"];
const optionalPositiveNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  return typeof value === "string" ? Number(value) : value;
}, z.number().int().positive().max(3650).optional());

const requiredPositiveNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  return typeof value === "string" ? Number(value) : value;
}, z.number().positive());

const durationMinutesSchema = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  return typeof value === "string" ? Number(value) : value;
}, z.number().int().min(5).max(600));

const capacitySchema = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  return typeof value === "string" ? Number(value) : value;
}, z.number().int().min(1).max(10000).optional());

const timeText = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time");

export const requireCustomDaysForCustomDuration = (body, context) => {
  if (body.durationKey === "custom" && !body.customDays) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customDays"],
      message: "Custom days are required for a custom plan",
    });
  }
};

export const planBodySchemaBase = z.object({
  gymId: z.string().min(1),
  durationKey: z.enum(durationKeys),
  customDays: optionalPositiveNumber,
  price: requiredPositiveNumber,
  features: z.array(z.string().trim().min(1)).optional(),
  timeSlots: z
    .array(
      z.object({
        startTime: timeText,
        durationMinutes: durationMinutesSchema,
        capacity: capacitySchema,
      }),
    )
    .optional(),
});

export const bookingSchema = z.object({
  body: z.object({
    planId: z.string().min(1),
    gymId: z.string().min(1),
    startDate: z.string().min(1),
    timeSlotId: z.string().trim().optional().or(z.literal("")),
    couponCode: z.string().trim().max(20).optional().or(z.literal("")),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const createPlanSchema = z.object({
  body: planBodySchemaBase.superRefine(requireCustomDaysForCustomDuration),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updatePlanSchema = z.object({
  body: planBodySchemaBase.superRefine(requireCustomDaysForCustomDuration),
  params: z.object({ planId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const planIdSchema = z.object({
  body: z.object({ gymId: z.string().min(1) }),
  params: z.object({ planId: z.string().min(1) }),
  query: z.object({}).optional(),
});
