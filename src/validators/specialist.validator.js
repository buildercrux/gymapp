import { z } from "zod";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdText = z.string().trim().regex(objectIdPattern, "Invalid id");
const optionalText = z.string().trim().optional().or(z.literal(""));

export const specialistServicesListSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const specialistRequestCreateSchema = z.object({
  body: z.object({
    gymId: objectIdText,
    serviceId: objectIdText,
    planId: objectIdText,
    memberIds: z.array(objectIdText).min(1),
    note: optionalText,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const specialistMyRequestsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    gymId: objectIdText.optional(),
  }).optional(),
});

export const specialistAdminRequestsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    serviceId: objectIdText.optional(),
  }).optional(),
});

export const specialistAdminStatusSchema = z.object({
  body: z.object({
    status: z.enum(["pending", "accepted", "in_progress", "completed", "rejected", "cancelled"]),
  }),
  params: z.object({
    requestId: objectIdText,
  }),
  query: z.object({}).optional(),
});
