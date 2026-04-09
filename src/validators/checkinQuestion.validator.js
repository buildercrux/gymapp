import { z } from "zod";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdText = z.string().trim().regex(objectIdPattern, "Invalid id");
const optionalText = z.string().trim().optional().or(z.literal(""));

const questionType = z.enum(["yes_no", "rating_1_5", "number", "text", "select"]);
const expectedMode = z.enum(["equals", "range", "contains"]);
const expectedSchema = z
  .object({
    mode: expectedMode,
    value: z.any().optional(),
    min: z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? undefined : Number(v)), z.number().optional()),
    max: z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? undefined : Number(v)), z.number().optional()),
  })
  .optional();

export const checkInQuestionsListSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    gymId: objectIdText,
  }),
});

export const checkInQuestionCreateSchema = z.object({
  body: z.object({
    gymId: objectIdText,
    label: z.string().trim().min(2),
    type: questionType,
    options: z.array(z.string().trim().min(1)).optional(),
    required: z.boolean().optional(),
    frequencyDays: z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? 1 : Number(v)), z.number().int().min(1).max(365)).optional(),
    expected: expectedSchema,
    alertOnUnexpected: z.boolean().optional(),
    order: z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? 0 : Number(v)), z.number().int().min(0)).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const checkInQuestionUpdateSchema = z.object({
  body: z.object({
    label: z.string().trim().min(2).optional(),
    type: questionType.optional(),
    options: z.array(z.string().trim().min(1)).optional(),
    required: z.boolean().optional(),
    frequencyDays: z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? undefined : Number(v)), z.number().int().min(1).max(365)).optional(),
    expected: expectedSchema,
    alertOnUnexpected: z.boolean().optional(),
    order: z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? undefined : Number(v)), z.number().int().min(0)).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    questionId: objectIdText,
  }),
  query: z.object({}).optional(),
});

export const checkInQuestionDeleteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    questionId: objectIdText,
  }),
  query: z.object({}).optional(),
});
