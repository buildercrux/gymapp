import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";
import { Coupon } from "../models/Coupon.js";
import { Gym } from "../models/Gym.js";
import { Plan } from "../models/Plan.js";

const assertGymAccess = async (actorId, actorRole, gymId) => {
  const gymFilter = actorRole === "admin" ? { _id: gymId } : { _id: gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }
};

const assertPlanInGym = async (gymId, planId) => {
  const plan = await Plan.findOne({ _id: planId, gym: gymId, isActive: true }).select("_id").lean();
  if (!plan) {
    throw new AppError("Plan not found for this gym", StatusCodes.NOT_FOUND);
  }
};

export const listCoupons = async ({ actorId, actorRole, gymId, planId, includeInactive = false }) => {
  await assertGymAccess(actorId, actorRole, gymId);
  const coupons = await Coupon.find({
    gym: gymId,
    ...(planId ? { plan: planId } : {}),
    ...(includeInactive ? {} : { isActive: true }),
  })
    .sort({ createdAt: -1 })
    .lean();

  return coupons;
};

export const createCoupon = async ({
  actorId,
  actorRole,
  gymId,
  planId,
  code,
  type,
  value,
  maxUses,
  expiresAt,
  isActive,
}) => {
  await Promise.all([assertGymAccess(actorId, actorRole, gymId), assertPlanInGym(gymId, planId)]);

  const set = {
    gym: gymId,
    plan: planId,
    code,
    type,
    value,
    isActive: isActive === false ? false : true,
  };
  if (typeof maxUses === "number") set.maxUses = maxUses;
  if (expiresAt instanceof Date) set.expiresAt = expiresAt;

  try {
    const coupon = await Coupon.findOneAndUpdate(
      { gym: gymId, plan: planId, code },
      {
        $set: {
          ...set,
        },
        $setOnInsert: { usedCount: 0 },
      },
      { upsert: true, new: true },
    ).lean();

    return coupon;
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError("Coupon code already exists for this plan", StatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const updateCoupon = async ({
  actorId,
  actorRole,
  couponId,
  gymId,
  code,
  type,
  value,
  maxUses,
  expiresAt,
  isActive,
}) => {
  await assertGymAccess(actorId, actorRole, gymId);

  const existing = await Coupon.findOne({ _id: couponId, gym: gymId }).select("_id plan").lean();
  if (!existing) {
    throw new AppError("Coupon not found for this gym", StatusCodes.NOT_FOUND);
  }

  const update = {
    ...(typeof code === "string" ? { code } : {}),
    ...(typeof type === "string" ? { type } : {}),
    ...(typeof value === "number" ? { value } : {}),
    ...(typeof maxUses === "number" ? { maxUses } : {}),
    ...(expiresAt instanceof Date ? { expiresAt } : {}),
    ...(typeof isActive === "boolean" ? { isActive } : {}),
  };

  try {
    const updated = await Coupon.findOneAndUpdate({ _id: couponId, gym: gymId }, { $set: update }, { new: true }).lean();
    return updated;
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError("Coupon code already exists for this plan", StatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const disableCoupon = async ({ actorId, actorRole, couponId, gymId }) => {
  await assertGymAccess(actorId, actorRole, gymId);
  const coupon = await Coupon.findOneAndUpdate(
    { _id: couponId, gym: gymId },
    { $set: { isActive: false } },
    { new: true },
  ).lean();

  if (!coupon) {
    throw new AppError("Coupon not found for this gym", StatusCodes.NOT_FOUND);
  }

  return { couponId, disabled: true };
};
