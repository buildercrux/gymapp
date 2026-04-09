import { z } from "zod";

export const exerciseQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    bodyPart: z.string().optional(),
    difficulty: z.string().optional(),
  }),
});

export const exerciseCreateSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    bodyPart: z.string().min(2),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    equipment: z.array(z.string()).optional(),
    alternatives: z.array(z.string()).optional(),
    instructions: z.array(z.string()).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
