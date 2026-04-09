import { z } from "zod";
import { ROLES } from "../constants/roles.js";

const emailSchema = z.string().trim().toLowerCase().email();
const phoneSchema = z.string().trim().regex(/^\d{10}$/, "Phone must be exactly 10 digits");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
const optionalEmailSchema = emailSchema.optional().or(z.literal(""));
const optionalPhoneSchema = phoneSchema.optional().or(z.literal(""));

export const sendSignupOtpSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const completeSignupSchema = z.object({
  body: z.object({
    email: emailSchema,
    code: z.string().length(6),
    phone: phoneSchema,
    password: passwordSchema,
    fullName: z.string().trim().min(2).optional(),
    role: z.enum(Object.values(ROLES)).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: optionalEmailSchema,
      phone: optionalPhoneSchema,
      password: passwordSchema,
    })
    .superRefine((body, ctx) => {
      if (!body.email && !body.phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Email or phone is required",
        });
      }
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const sendPasswordResetOtpSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const completePasswordResetSchema = z.object({
  body: z.object({
    email: emailSchema,
    code: z.string().length(6),
    password: passwordSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
