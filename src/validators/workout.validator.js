import { z } from "zod";

export const startSessionSchema = z.object({
  body: z.object({
    gymId: z.string().min(1),
    qrToken: z.string().min(1),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const trainerDecisionSchema = z.object({
  body: z.object({
    requestId: z.string().min(1),
    decision: z.enum(["accepted", "rejected"]),
    modeType: z.string().trim().min(1).optional().or(z.literal("")),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const addExerciseSchema = z.object({
  body: z.object({
    exercise: z.string().min(1),
    sets: z.number().int().positive().optional(),
    reps: z.number().int().positive().optional(),
    weightKg: z.number().nonnegative().optional(),
    durationMinutes: z.number().positive().optional(),
    notes: z.string().optional(),
  }),
  params: z.object({ sessionId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const sessionIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ sessionId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const trainerSessionIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ sessionId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const plannedExerciseAddSchema = z.object({
  body: z.object({
    exerciseId: z.string().min(1),
  }),
  params: z.object({ sessionId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const plannedExerciseRemoveSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    sessionId: z.string().min(1),
    plannedId: z.string().min(1),
  }),
  query: z.object({}).optional(),
});
