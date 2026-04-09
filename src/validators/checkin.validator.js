import { z } from "zod";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdText = z.string().trim().regex(objectIdPattern, "Invalid id");
const optionalText = z.string().trim().optional().or(z.literal(""));

export const checkInSettingsListSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    gymId: objectIdText,
  }),
});

export const checkInSettingsUpdateSchema = z.object({
  body: z.object({
    gymId: objectIdText,
    memberId: objectIdText,
    enabled: z.boolean(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const checkInPromptSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const checkInAlertsListSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    gymId: objectIdText,
    days: z
      .preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? 7 : Number(v)), z.number().int().min(1).max(90))
      .optional(),
  }),
});

export const checkInMyListSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    gymId: objectIdText,
    days: z
      .preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? 30 : Number(v)), z.number().int().min(1).max(90))
      .optional(),
  }),
});

export const checkInSubmissionsListSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    gymId: objectIdText,
    memberId: objectIdText.optional(),
    days: z
      .preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? 30 : Number(v)), z.number().int().min(1).max(90))
      .optional(),
  }),
});

export const checkInSubmitSchema = z.object({
  body: z.object({
    gymId: objectIdText,
    sleepHours: z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? undefined : Number(v)), z.number().min(0).max(24).optional()),
    sleepQuality: z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? undefined : Number(v)), z.number().int().min(1).max(5).optional()),
    waterLiters: z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? undefined : Number(v)), z.number().min(0).max(20).optional()),
    energy: z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? undefined : Number(v)), z.number().int().min(1).max(5).optional()),
    painScore: z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? undefined : Number(v)), z.number().min(0).max(10).optional()),
    painArea: optionalText,
    workoutTime: z.enum(["none", "normal", "more_than_expected"]).optional(),
    notes: optionalText,
    customAnswers: z.record(z.any()).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
