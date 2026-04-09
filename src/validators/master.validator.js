import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));

const objectIdText = z.string().min(1);
const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }
  return typeof value === "string" ? Number(value) : value;
}, z.number().optional());

const equipmentIdParams = z.object({ equipmentId: objectIdText });
const workoutTypeIdParams = z.object({ workoutTypeId: objectIdText });
const exerciseIdParams = z.object({ exerciseId: objectIdText });
const specialistServiceIdParams = z.object({ serviceId: objectIdText });
const servicePlanIdParams = z.object({ serviceId: objectIdText, planId: objectIdText });

export const equipmentCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2),
    category: z.string().trim().min(1),
    type: optionalText,
    bodyPartsSupported: z.array(z.string().trim().min(2)).optional(),
    movementType: z.string().trim().min(1),
    loadType: z.string().trim().min(1),
    weightRange: z
      .object({
        min: optionalNumber,
        max: optionalNumber,
        unit: z.string().trim().min(1).optional(),
      })
      .optional(),
    weightSteps: optionalNumber,
    adjustableSettings: z
      .object({
        seatHeight: z.boolean().optional(),
        inclineLevels: z.array(z.number()).optional(),
        handlePositions: z.boolean().optional(),
      })
      .optional(),
    cardioFeatures: z
      .object({
        speedRange: z
          .object({ min: optionalNumber, max: optionalNumber, unit: z.string().trim().min(1).optional() })
          .optional(),
        inclineRange: z
          .object({ min: optionalNumber, max: optionalNumber, unit: z.string().trim().min(1).optional() })
          .optional(),
      })
      .optional(),
    usageType: z.string().trim().min(1),
    difficulty: z.string().trim().min(1),
    description: optionalText,
    imageUrl: optionalText,
    property: z.any().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const equipmentUpdateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    category: z.string().trim().min(1).optional(),
    type: optionalText,
    bodyPartsSupported: z.array(z.string().trim().min(2)).optional(),
    movementType: z.string().trim().min(1).optional(),
    loadType: z.string().trim().min(1).optional(),
    weightRange: z
      .object({
        min: optionalNumber,
        max: optionalNumber,
        unit: z.string().trim().min(1).optional(),
      })
      .optional(),
    weightSteps: optionalNumber,
    adjustableSettings: z
      .object({
        seatHeight: z.boolean().optional(),
        inclineLevels: z.array(z.number()).optional(),
        handlePositions: z.boolean().optional(),
      })
      .optional(),
    cardioFeatures: z
      .object({
        speedRange: z
          .object({ min: optionalNumber, max: optionalNumber, unit: z.string().trim().min(1).optional() })
          .optional(),
        inclineRange: z
          .object({ min: optionalNumber, max: optionalNumber, unit: z.string().trim().min(1).optional() })
          .optional(),
      })
      .optional(),
    usageType: z.string().trim().min(1).optional(),
    difficulty: z.string().trim().min(1).optional(),
    description: optionalText,
    imageUrl: optionalText,
    property: z.any().optional(),
  }),
  params: equipmentIdParams,
  query: z.object({}).optional(),
});

export const equipmentDeleteSchema = z.object({
  body: z.object({}).optional(),
  params: equipmentIdParams,
  query: z.object({}).optional(),
});

export const workoutTypeCreateSchema = z.object({
  body: z.object({
    modeType: z.string().trim().min(1),
    dayCycle: z.preprocess((value) => (typeof value === "string" ? Number(value) : value), z.number().int().min(1)),
    target: z.array(z.string().trim().min(2)).min(1),
    goal: z.string().trim().min(1),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const workoutTypeUpdateSchema = z.object({
  body: z.object({
    modeType: z.string().trim().min(1).optional(),
    dayCycle: z
      .preprocess((value) => (typeof value === "string" ? Number(value) : value), z.number().int().min(1))
      .optional(),
    target: z.array(z.string().trim().min(2)).min(1).optional(),
    goal: z.string().trim().min(1).optional(),
  }),
  params: workoutTypeIdParams,
  query: z.object({}).optional(),
});

export const workoutTypeDeleteSchema = z.object({
  body: z.object({}).optional(),
  params: workoutTypeIdParams,
  query: z.object({}).optional(),
});

export const exerciseMasterCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2),
    bodyPart: z.string().trim().min(2),
    mode: z.string().trim().min(2),
    difficulty: z.string().trim().min(1),
    goal: z.string().trim().min(1),
    equipmentId: objectIdText.optional().or(z.literal("")),
    prerequisites: z.array(objectIdText).optional(),
    instructions: z.array(z.string().trim().min(1)).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const exerciseMasterUpdateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    bodyPart: z.string().trim().min(2).optional(),
    mode: z.string().trim().min(1).optional(),
    difficulty: z.string().trim().min(1).optional(),
    goal: z.string().trim().min(1).optional(),
    equipmentId: objectIdText.optional().or(z.literal("")),
    prerequisites: z.array(objectIdText).optional(),
    instructions: z.array(z.string().trim().min(1)).optional(),
  }),
  params: exerciseIdParams,
  query: z.object({}).optional(),
});

export const exerciseMasterDeleteSchema = z.object({
  body: z.object({}).optional(),
  params: exerciseIdParams,
  query: z.object({}).optional(),
});

export const specialistPricingUpdateSchema = z.object({
  body: z.object({
    currency: z.string().trim().min(3).max(6).optional(),
    tiers: z
      .array(
        z.object({
          minApplications: z.preprocess(
            (value) => (typeof value === "string" ? Number(value) : value),
            z.number().int().min(0),
          ),
          pricePerApplication: z.preprocess(
            (value) => (typeof value === "string" ? Number(value) : value),
            z.number().min(0),
          ),
        }),
      )
      .min(1),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const specialistServiceCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2),
    type: z.string().trim().min(2),
    description: optionalText,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const specialistServiceUpdateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    type: z.string().trim().min(2).optional(),
    description: optionalText.optional(),
  }),
  params: specialistServiceIdParams,
  query: z.object({}).optional(),
});

export const specialistServiceDeleteSchema = z.object({
  body: z.object({}).optional(),
  params: specialistServiceIdParams,
  query: z.object({}).optional(),
});

export const servicePlansListSchema = z.object({
  body: z.object({}).optional(),
  params: specialistServiceIdParams,
  query: z.object({}).optional(),
});

export const servicePlanCreateSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2),
    currency: z.string().trim().min(3).max(6).optional(),
    pricingTiers: z
      .array(
        z.object({
          minApplications: z.preprocess(
            (value) => (typeof value === "string" ? Number(value) : value),
            z.number().int().min(1),
          ),
          pricePerApplication: z.preprocess(
            (value) => (typeof value === "string" ? Number(value) : value),
            z.number().min(0),
          ),
        }),
      )
      .min(1),
    description: optionalText,
  }),
  params: specialistServiceIdParams,
  query: z.object({}).optional(),
});

export const servicePlanUpdateSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).optional(),
    currency: z.string().trim().min(3).max(6).optional(),
    pricingTiers: z
      .array(
        z.object({
          minApplications: z.preprocess(
            (value) => (typeof value === "string" ? Number(value) : value),
            z.number().int().min(1),
          ),
          pricePerApplication: z.preprocess(
            (value) => (typeof value === "string" ? Number(value) : value),
            z.number().min(0),
          ),
        }),
      )
      .min(1)
      .optional(),
    description: optionalText.optional(),
  }),
  params: servicePlanIdParams,
  query: z.object({}).optional(),
});

export const servicePlanDeleteSchema = z.object({
  body: z.object({}).optional(),
  params: servicePlanIdParams,
  query: z.object({}).optional(),
});
