import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalPositiveNumber = z.number().positive().optional();
const optionalInteger = z.number().int().positive().optional();
const optionalBoolean = z.boolean().optional();
const optionalStringArray = z.array(z.string().trim()).optional();

export const profileSchema = z.object({
  body: z.object({
    fullName: optionalText,
    email: z.string().email().optional().or(z.literal("")),
    age: optionalInteger,
    gender: optionalText,
    fitnessGoal: optionalText,
    occupationType: z
      .enum(["desk-job", "field-job", "active-job", "mixed-shift", "student", "homemaker"])
      .optional(),
    location: optionalText,
    locationArea: optionalText,
    locationCity: optionalText,
    locationState: optionalText,
    locationCountry: optionalText,
    locationCoordinates: z
      .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
      .optional(),
    speakingLanguages: optionalStringArray,
    speakingLanguageOther: optionalText,
    heightCm: optionalPositiveNumber,
    weightKg: optionalPositiveNumber,
    bodyFatPercentage: optionalPositiveNumber,
    neckCm: optionalPositiveNumber,
    waistCm: optionalPositiveNumber,
    hipCm: optionalPositiveNumber,
    chestCm: optionalPositiveNumber,
    bodyType: z.enum(["ectomorph", "mesomorph", "endomorph"]).optional(),
    fatDistributionType: z.enum(["apple", "pear"]).optional(),
    sleepDurationHours: optionalPositiveNumber,
    sleepTiming: optionalText,
    sleepQuality: z.number().int().min(1).max(5).optional(),
    screenTimeBeforeBedMinutes: optionalPositiveNumber,
    dietType: z.enum(["veg", "non-veg", "vegan"]).optional(),
    mealPattern: z.enum(["2", "3", "4+"]).optional(),
    eatingBehavior: optionalText,
    emotionalEating: optionalBoolean,
    lateNightEating: optionalBoolean,
    bingeEating: optionalBoolean,
    waterIntakeLiters: optionalPositiveNumber,
    sugarIntakeLevel: z.enum(["low", "moderate", "high"]).optional(),
    caffeineIntake: z.enum(["none", "low", "moderate", "high"]).optional(),
    medications: optionalText,
    allergies: optionalText,
    medicalNotes: optionalText,
    otherConditions: optionalText,
    otherInjuries: optionalText,
    conditions: z
      .object({
        diabetes: optionalBoolean,
        thyroid: optionalBoolean,
        pcos: optionalBoolean,
        bp: optionalBoolean,
      })
      .optional(),
    injuries: z
      .object({
        knee: optionalBoolean,
        back: optionalBoolean,
        shoulder: optionalBoolean,
      })
      .optional(),
    trainerExperience: z
      .array(
        z.object({
          gymName: optionalText,
          location: optionalText,
          years: optionalPositiveNumber,
        }),
      )
      .optional(),
    trainerSpecializations: optionalStringArray,
    trainerSpecializationOther: optionalText,
    trainerCertifications: optionalStringArray,
    trainerCertificationOther: optionalText,
    trainerEducation: optionalText,
    trainerBodyTypeExpertise: optionalStringArray,
    trainerTargetAudience: optionalStringArray,
    trainerTargetAudienceOther: optionalText,
    trainerProgramTypes: optionalStringArray,
    trainerProgramTypeOther: optionalText,
    trainerLocationMode: optionalText,
    trainerLanguages: optionalStringArray,
    trainerLanguageOther: optionalText,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
