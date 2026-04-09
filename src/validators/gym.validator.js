import { z } from "zod";
import { planBodySchemaBase, requireCustomDaysForCustomDuration, planIdSchema } from "./plan.validator.js";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalPhone = z
  .string()
  .regex(/^\d{10}$/, "Phone must be exactly 10 digits")
  .optional()
  .or(z.literal(""));
const optionalPositiveNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  return typeof value === "string" ? Number(value) : value;
}, z.number().positive().optional());
const optionalInteger = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  return typeof value === "string" ? Number(value) : value;
}, z.number().int().positive().optional());

export const createGymSchema = z.object({
  body: z.object({
    name: z.string().min(3),
    assetId: optionalText,
    assetKey: optionalText,
    location: z.object({
      address: z.string().min(3),
      city: z.string().min(2),
      state: z.string().min(2),
      country: z.string().min(2),
      coordinates: z
        .object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        })
        .optional(),
    }),
    amenities: z.array(z.string()).optional(),
  }).superRefine((body, context) => {
    const hasAssetId = Boolean(String(body.assetId || "").trim());
    const hasAssetKey = Boolean(String(body.assetKey || "").trim());
    if (hasAssetId !== hasAssetKey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assetId"],
        message: "Asset ID and Asset Key must both be provided",
      });
    }
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const trainerLookupSchema = z.object({
  body: z.object({
    gymId: z.string().min(1),
    email: z.string().email(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const trainerEmailOtpSendSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const trainerEmailOtpVerifySchema = z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string().length(6),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const addTrainerSchema = z.object({
  body: z.object({
    gymId: z.string().min(1),
    email: z.string().email(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const removeTrainerSchema = z.object({
  body: z.object({
    gymId: z.string().min(1),
    trainerId: z.string().min(1),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const gymIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const setGymEquipmentSchema = z.object({
  body: z.object({
    equipmentIds: z.array(z.string().min(1)).default([]),
  }),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const setGymAssetSchema = z.object({
  body: z.object({
    assetId: z.string().trim().min(1),
    assetKey: z.string().trim().min(1),
  }),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const gymAdminStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

const requirePhoneOrEmail = (body, context) => {
  if (!body.phone && !body.email) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["phone"],
      message: "Phone or email is required",
    });
  }
};

const memberLookupBodySchema = z.object({
  phone: optionalPhone,
  email: z.string().email().optional().or(z.literal("")),
});

export const memberLookupSchema = z.object({
  body: memberLookupBodySchema.superRefine(requirePhoneOrEmail),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const enrollMemberBodySchema = z.object({
  gymId: z.string().min(1),
  planId: z.string().min(1),
  startDate: z.string().min(1),
  timeSlotId: optionalText,
  couponCode: optionalText,
  phone: optionalPhone,
  email: z.string().email().optional().or(z.literal("")),
  fullName: optionalText,
  age: optionalInteger,
  gender: z.enum(["male", "female"]).optional(),
  fitnessGoal: optionalText,
  occupationType: z
    .enum(["desk-job", "field-job", "active-job", "mixed-shift", "student", "homemaker"])
    .optional(),
  heightCm: optionalPositiveNumber,
  weightKg: optionalPositiveNumber,
  bodyType: z.enum(["ectomorph", "mesomorph", "endomorph"]).optional(),
  fatDistributionType: z.enum(["apple", "pear"]).optional(),
  medicalNotes: optionalText,
});

export const enrollMemberSchema = z.object({
  body: enrollMemberBodySchema.superRefine(requirePhoneOrEmail),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const memberEmailOtpSendSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const memberEmailOtpVerifySchema = z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string().length(6),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const ownerAnalyticsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      days: optionalInteger.optional(),
    })
    .optional(),
});

export const setGymAssetPermissionsSchema = z.object({
  body: z.object({
    overview: z.union([z.boolean(), z.number().int().min(0).max(2), z.enum(["none", "view", "edit"])]).optional(),
    plans: z.union([z.boolean(), z.number().int().min(0).max(2), z.enum(["none", "view", "edit"])]).optional(),
    trainers: z.union([z.boolean(), z.number().int().min(0).max(2), z.enum(["none", "view", "edit"])]).optional(),
    members: z.union([z.boolean(), z.number().int().min(0).max(2), z.enum(["none", "view", "edit"])]).optional(),
    accounts: z.union([z.boolean(), z.number().int().min(0).max(2), z.enum(["none", "view", "edit"])]).optional(),
    equipment: z.union([z.boolean(), z.number().int().min(0).max(2), z.enum(["none", "view", "edit"])]).optional(),
    specialists: z.union([z.boolean(), z.number().int().min(0).max(2), z.enum(["none", "view", "edit"])]).optional(),
  }),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

const decimalSchema = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  return typeof value === "string" ? Number(value) : value;
}, z.number().finite().min(0));

const optionalDateSchema = z.preprocess((value) => {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}, z.date().optional());

export const assetTransactionsListSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({
    accountType: z.enum(["income", "expense"]).optional(),
    category: z.string().trim().min(1).max(60).optional(),
    from: optionalDateSchema,
    to: optionalDateSchema,
  }).optional(),
});

export const assetTransactionsCreateSchema = z.object({
  body: z.object({
    accountType: z.enum(["income", "expense"]),
    category: z.string().trim().min(1).max(60),
    entityUserId: z.string().trim().optional().or(z.literal("")),
    entityRole: z.enum(["member", "staff"]).optional().or(z.literal("")),
    entityName: z.string().trim().max(120).optional().or(z.literal("")),
    comment: z.string().trim().max(500).optional().or(z.literal("")),
    totalAmount: decimalSchema,
    paidAmount: decimalSchema,
    periodStart: optionalDateSchema,
    periodEnd: optionalDateSchema,
  }),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetTransactionsUpdateSchema = z.object({
  body: z.object({
    accountType: z.enum(["income", "expense"]).optional(),
    category: z.string().trim().min(1).max(60).optional(),
    entityUserId: z.string().trim().optional().or(z.literal("")),
    entityRole: z.enum(["member", "staff"]).optional().or(z.literal("")),
    entityName: z.string().trim().max(120).optional().or(z.literal("")),
    comment: z.string().trim().max(500).optional().or(z.literal("")),
    totalAmount: decimalSchema.optional(),
    paidAmount: decimalSchema.optional(),
    periodStart: optionalDateSchema,
    periodEnd: optionalDateSchema,
  }),
  params: z.object({ gymId: z.string().min(1), transactionId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetTransactionsDeleteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ gymId: z.string().min(1), transactionId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetTrainerLookupSchema = z.object({
  body: trainerLookupSchema.shape.body.omit({ gymId: true }),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetTrainerEmailOtpSendSchema = z.object({
  body: trainerEmailOtpSendSchema.shape.body,
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetTrainerEmailOtpVerifySchema = z.object({
  body: trainerEmailOtpVerifySchema.shape.body,
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetAddTrainerSchema = z.object({
  body: addTrainerSchema.shape.body.omit({ gymId: true }),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetRemoveTrainerSchema = z.object({
  body: removeTrainerSchema.shape.body.omit({ gymId: true }),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetMemberLookupSchema = z.object({
  body: memberLookupBodySchema.superRefine(requirePhoneOrEmail),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetMemberEmailOtpSendSchema = z.object({
  body: memberEmailOtpSendSchema.shape.body,
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetMemberEmailOtpVerifySchema = z.object({
  body: memberEmailOtpVerifySchema.shape.body,
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetEnrollMemberSchema = z.object({
  body: enrollMemberBodySchema.omit({ gymId: true }).superRefine(requirePhoneOrEmail),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetPlanCreateSchema = z.object({
  body: planBodySchemaBase.omit({ gymId: true }).superRefine(requireCustomDaysForCustomDuration),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetPlanUpdateSchema = z.object({
  body: planBodySchemaBase.omit({ gymId: true }).superRefine(requireCustomDaysForCustomDuration),
  params: z.object({ gymId: z.string().min(1), planId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetPlanDeleteSchema = z.object({
  body: planIdSchema.shape.body.omit({ gymId: true }).optional(),
  params: z.object({ gymId: z.string().min(1), planId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetCouponValidateSchema = z.object({
  body: z.object({
    planId: z.string().min(1),
    couponCode: optionalText,
  }),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({}).optional(),
});

export const assetCouponsListSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ gymId: z.string().min(1) }),
  query: z.object({
    planId: z.string().min(1).optional(),
    includeInactive: z.preprocess((value) => {
      if (value === "" || value === null || typeof value === "undefined") return undefined;
      if (typeof value === "boolean") return value;
      const text = String(value).trim().toLowerCase();
      if (text === "true") return true;
      if (text === "false") return false;
      return value;
    }, z.boolean().optional()),
  }).optional(),
});

export const assetCouponDeleteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ gymId: z.string().min(1), couponId: z.string().min(1) }),
  query: z.object({}).optional(),
});
