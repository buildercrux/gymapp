import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";
import { Equipment } from "../models/Equipment.js";
import { Exercise } from "../models/Exercise.js";
import { SpecialistPlan } from "../models/SpecialistPlan.js";
import { SpecialistPricing } from "../models/SpecialistPricing.js";
import { SpecialistService } from "../models/SpecialistService.js";
import { WorkoutType } from "../models/WorkoutType.js";

const isDuplicateKeyError = (error) => Boolean(error && typeof error === "object" && error.code === 11000);

export const listEquipment = async () =>
  Equipment.find({ isActive: true }).sort({ name: 1 }).lean();

export const createEquipment = async (payload) => {
  try {
    const equipment = await Equipment.create({
      name: payload.name,
      category: payload.category,
      type: payload.type || undefined,
      bodyPartsSupported: payload.bodyPartsSupported || [],
      movementType: payload.movementType,
      loadType: payload.loadType,
      weightRange: payload.weightRange,
      weightSteps: payload.weightSteps,
      adjustableSettings: payload.adjustableSettings,
      cardioFeatures: payload.cardioFeatures,
      usageType: payload.usageType,
      difficulty: payload.difficulty,
      description: payload.description || undefined,
      imageUrl: payload.imageUrl || undefined,
      property: payload.property,
    });
    return equipment.toObject();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("Equipment name already exists", StatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const updateEquipment = async (equipmentId, payload) => {
  const update = {};

  if (typeof payload.name !== "undefined") update.name = payload.name;
  if (typeof payload.category !== "undefined") update.category = payload.category;
  if (typeof payload.type !== "undefined") update.type = payload.type || undefined;
  if (typeof payload.bodyPartsSupported !== "undefined") update.bodyPartsSupported = payload.bodyPartsSupported || [];
  if (typeof payload.movementType !== "undefined") update.movementType = payload.movementType;
  if (typeof payload.loadType !== "undefined") update.loadType = payload.loadType;
  if (typeof payload.weightRange !== "undefined") update.weightRange = payload.weightRange;
  if (typeof payload.weightSteps !== "undefined") update.weightSteps = payload.weightSteps;
  if (typeof payload.adjustableSettings !== "undefined") update.adjustableSettings = payload.adjustableSettings;
  if (typeof payload.cardioFeatures !== "undefined") update.cardioFeatures = payload.cardioFeatures;
  if (typeof payload.usageType !== "undefined") update.usageType = payload.usageType;
  if (typeof payload.difficulty !== "undefined") update.difficulty = payload.difficulty;
  if (typeof payload.description !== "undefined") update.description = payload.description || undefined;
  if (typeof payload.imageUrl !== "undefined") update.imageUrl = payload.imageUrl || undefined;
  if (typeof payload.property !== "undefined") update.property = payload.property;

  try {
    const equipment = await Equipment.findOneAndUpdate(
      { _id: equipmentId, isActive: true },
      { $set: update },
      { new: true, runValidators: true },
    ).lean();

    if (!equipment) {
      throw new AppError("Equipment not found", StatusCodes.NOT_FOUND);
    }

    return equipment;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("Equipment name already exists", StatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const deleteEquipment = async (equipmentId) => {
  const equipment = await Equipment.findOneAndUpdate(
    { _id: equipmentId, isActive: true },
    { $set: { isActive: false } },
    { new: true },
  )
    .select("_id name isActive")
    .lean();

  if (!equipment) {
    throw new AppError("Equipment not found", StatusCodes.NOT_FOUND);
  }

  return { equipmentId: equipment._id, deleted: true };
};

export const listWorkoutTypes = async () =>
  WorkoutType.find({ isActive: true }).sort({ modeType: 1, dayCycle: 1 }).lean();

export const createWorkoutType = async (payload) => {
  const workoutType = await WorkoutType.create({
    modeType: payload.modeType,
    dayCycle: payload.dayCycle,
    target: payload.target,
    goal: payload.goal,
  });
  return workoutType.toObject();
};

export const updateWorkoutType = async (workoutTypeId, payload) => {
  const update = {};

  if (typeof payload.modeType !== "undefined") update.modeType = payload.modeType;
  if (typeof payload.dayCycle !== "undefined") update.dayCycle = payload.dayCycle;
  if (typeof payload.target !== "undefined") update.target = payload.target;
  if (typeof payload.goal !== "undefined") update.goal = payload.goal;

  const workoutType = await WorkoutType.findOneAndUpdate(
    { _id: workoutTypeId, isActive: true },
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  if (!workoutType) {
    throw new AppError("Workout type not found", StatusCodes.NOT_FOUND);
  }

  return workoutType;
};

export const deleteWorkoutType = async (workoutTypeId) => {
  const workoutType = await WorkoutType.findOneAndUpdate(
    { _id: workoutTypeId, isActive: true },
    { $set: { isActive: false } },
    { new: true },
  )
    .select("_id")
    .lean();

  if (!workoutType) {
    throw new AppError("Workout type not found", StatusCodes.NOT_FOUND);
  }

  return { workoutTypeId: workoutType._id, deleted: true };
};

export const listExerciseMasters = async () =>
  Exercise.find({ isActive: true })
    .populate("equipmentId", "name image")
    .populate("prerequisites", "name bodyPart difficulty")
    .sort({ name: 1 })
    .lean();

export const createExerciseMaster = async (payload) => {
  const equipmentId = payload.equipmentId || undefined;

  if (equipmentId) {
    const equipment = await Equipment.findOne({ _id: equipmentId, isActive: true }).select("_id").lean();
    if (!equipment) {
      throw new AppError("Equipment not found", StatusCodes.NOT_FOUND);
    }
  }

  const prerequisiteIds = payload.prerequisites || [];
  if (prerequisiteIds.length) {
    const found = await Exercise.find({ _id: { $in: prerequisiteIds }, isActive: true }).select("_id").lean();
    if (found.length !== prerequisiteIds.length) {
      throw new AppError("One or more prerequisite exercises were not found", StatusCodes.NOT_FOUND);
    }
  }

  let exercise;
  try {
    exercise = await Exercise.create({
      name: payload.name,
      bodyPart: payload.bodyPart,
      mode: payload.mode,
      difficulty: payload.difficulty,
      goal: payload.goal,
      equipmentId,
      prerequisites: prerequisiteIds.length ? prerequisiteIds : undefined,
      instructions: payload.instructions || [],
      equipment: [],
      alternatives: [],
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("Exercise name already exists", StatusCodes.CONFLICT);
    }
    throw error;
  }

  return Exercise.findById(exercise._id)
    .populate("equipmentId", "name image")
    .populate("prerequisites", "name bodyPart difficulty")
    .lean();
};

export const updateExerciseMaster = async (exerciseId, payload) => {
  const existing = await Exercise.findOne({ _id: exerciseId, isActive: true }).select("_id").lean();
  if (!existing) {
    throw new AppError("Exercise not found", StatusCodes.NOT_FOUND);
  }

  const update = {};

  if (typeof payload.name !== "undefined") update.name = payload.name;
  if (typeof payload.bodyPart !== "undefined") update.bodyPart = payload.bodyPart;
  if (typeof payload.mode !== "undefined") update.mode = payload.mode;
  if (typeof payload.difficulty !== "undefined") update.difficulty = payload.difficulty;
  if (typeof payload.goal !== "undefined") update.goal = payload.goal;

  if (typeof payload.equipmentId !== "undefined") {
    const equipmentId = payload.equipmentId || undefined;
    if (equipmentId) {
      const equipment = await Equipment.findOne({ _id: equipmentId, isActive: true }).select("_id").lean();
      if (!equipment) {
        throw new AppError("Equipment not found", StatusCodes.NOT_FOUND);
      }
    }
    update.equipmentId = equipmentId;
  }

  if (typeof payload.prerequisites !== "undefined") {
    const prerequisiteIds = payload.prerequisites || [];
    if (prerequisiteIds.length) {
      const found = await Exercise.find({ _id: { $in: prerequisiteIds }, isActive: true }).select("_id").lean();
      if (found.length !== prerequisiteIds.length) {
        throw new AppError("One or more prerequisite exercises were not found", StatusCodes.NOT_FOUND);
      }
    }
    update.prerequisites = prerequisiteIds.length ? prerequisiteIds : undefined;
  }

  if (typeof payload.instructions !== "undefined") {
    update.instructions = payload.instructions || [];
  }

  try {
    await Exercise.updateOne({ _id: exerciseId }, { $set: update });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("Exercise name already exists", StatusCodes.CONFLICT);
    }
    throw error;
  }

  return Exercise.findById(exerciseId)
    .populate("equipmentId", "name image")
    .populate("prerequisites", "name bodyPart difficulty")
    .lean();
};

export const deleteExerciseMaster = async (exerciseId) => {
  const exercise = await Exercise.findOneAndUpdate(
    { _id: exerciseId, isActive: true },
    { $set: { isActive: false } },
    { new: true },
  )
    .select("_id")
    .lean();

  if (!exercise) {
    throw new AppError("Exercise not found", StatusCodes.NOT_FOUND);
  }

  return { exerciseId: exercise._id, deleted: true };
};

const normalizePricingTiers = (tiers = []) => {
  const normalized = (tiers || [])
    .map((tier) => ({
      minApplications: Number(tier.minApplications),
      pricePerApplication: Number(tier.pricePerApplication),
    }))
    .filter(
      (tier) =>
        Number.isFinite(tier.minApplications) &&
        Number.isFinite(tier.pricePerApplication) &&
        tier.minApplications >= 0 &&
        tier.pricePerApplication >= 0,
    )
    .sort((a, b) => a.minApplications - b.minApplications);

  const unique = [];
  const seen = new Set();
  normalized.forEach((tier) => {
    const key = String(tier.minApplications);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(tier);
  });

  return unique;
};

export const listSpecialistServices = async () =>
  SpecialistService.find({ isActive: true }).sort({ createdAt: -1 }).lean();

export const createSpecialistService = async (payload) => {
  const service = await SpecialistService.create({
    name: payload.name,
    type: payload.type,
    description: payload.description || undefined,
  });
  return service.toObject();
};

export const updateSpecialistService = async (serviceId, payload) => {
  const update = {};
  if (typeof payload.name !== "undefined") update.name = payload.name;
  if (typeof payload.type !== "undefined") update.type = payload.type;
  if (typeof payload.description !== "undefined") update.description = payload.description || undefined;

  const service = await SpecialistService.findOneAndUpdate(
    { _id: serviceId, isActive: true },
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  if (!service) {
    throw new AppError("Service not found", StatusCodes.NOT_FOUND);
  }

  return service;
};

export const deleteSpecialistService = async (serviceId) => {
  const service = await SpecialistService.findOneAndUpdate(
    { _id: serviceId, isActive: true },
    { $set: { isActive: false } },
    { new: true },
  )
    .select("_id")
    .lean();

  if (!service) {
    throw new AppError("Service not found", StatusCodes.NOT_FOUND);
  }

  await Promise.all([
    SpecialistPlan.updateMany({ service: serviceId }, { $set: { isActive: false } }),
  ]);

  return { serviceId: service._id, deleted: true };
};

export const getSpecialistPricing = async () => {
  const pricing = await SpecialistPricing.findOne({ key: "default" }).lean();
  if (pricing) return pricing;
  return { key: "default", currency: "INR", tiers: [] };
};

export const setSpecialistPricing = async (payload) => {
  const tiers = normalizePricingTiers(payload.tiers || []);
  const currency = payload.currency ? String(payload.currency).trim().toUpperCase() : "INR";

  const pricing = await SpecialistPricing.findOneAndUpdate(
    { key: "default" },
    { $set: { currency, tiers } },
    { upsert: true, new: true, runValidators: true },
  ).lean();

  return pricing;
};

export const listServicePlans = async (serviceId) =>
  SpecialistPlan.find({ service: serviceId, isActive: true })
    .sort({ createdAt: -1 })
    .lean();

export const createServicePlan = async (serviceId, payload) => {
  const service = await SpecialistService.findOne({ _id: serviceId, isActive: true }).select("_id").lean();
  if (!service) {
    throw new AppError("Service not found", StatusCodes.NOT_FOUND);
  }

  const currency = payload.currency ? String(payload.currency).trim().toUpperCase() : "INR";
  const pricingTiers = (payload.pricingTiers || [])
    .map((tier) => ({
      minApplications: Number(tier.minApplications),
      pricePerApplication: Number(tier.pricePerApplication),
    }))
    .filter(
      (tier) =>
        Number.isFinite(tier.minApplications) &&
        Number.isFinite(tier.pricePerApplication) &&
        tier.minApplications >= 1 &&
        tier.pricePerApplication >= 0,
    )
    .sort((a, b) => a.minApplications - b.minApplications);

  if (!pricingTiers.length) {
    throw new AppError("Add at least one pricing tier", StatusCodes.BAD_REQUEST);
  }

  const plan = await SpecialistPlan.create({
    service: serviceId,
    title: payload.title,
    currency,
    pricingTiers,
    description: payload.description || undefined,
  });

  return plan.toObject();
};

export const updateServicePlan = async (serviceId, planId, payload) => {
  const update = {};
  if (typeof payload.title !== "undefined") update.title = payload.title;
  if (typeof payload.currency !== "undefined") update.currency = String(payload.currency || "INR").trim().toUpperCase();
  if (typeof payload.description !== "undefined") update.description = payload.description || undefined;
  if (typeof payload.pricingTiers !== "undefined") {
    const pricingTiers = (payload.pricingTiers || [])
      .map((tier) => ({
        minApplications: Number(tier.minApplications),
        pricePerApplication: Number(tier.pricePerApplication),
      }))
      .filter(
        (tier) =>
          Number.isFinite(tier.minApplications) &&
          Number.isFinite(tier.pricePerApplication) &&
          tier.minApplications >= 1 &&
          tier.pricePerApplication >= 0,
      )
      .sort((a, b) => a.minApplications - b.minApplications);

    if (!pricingTiers.length) {
      throw new AppError("Add at least one pricing tier", StatusCodes.BAD_REQUEST);
    }

    update.pricingTiers = pricingTiers;
  }

  const plan = await SpecialistPlan.findOneAndUpdate(
    { _id: planId, service: serviceId, isActive: true },
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  if (!plan) {
    throw new AppError("Specialist plan not found", StatusCodes.NOT_FOUND);
  }

  return plan;
};

export const deleteServicePlan = async (serviceId, planId) => {
  const plan = await SpecialistPlan.findOneAndUpdate(
    { _id: planId, service: serviceId, isActive: true },
    { $set: { isActive: false } },
    { new: true },
  )
    .select("_id")
    .lean();

  if (!plan) {
    throw new AppError("Specialist plan not found", StatusCodes.NOT_FOUND);
  }

  return { planId: plan._id, deleted: true };
};
