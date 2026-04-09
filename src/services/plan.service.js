import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";
import { Booking } from "../models/Booking.js";
import { Coupon } from "../models/Coupon.js";
import { Gym } from "../models/Gym.js";
import { PLAN_DURATION_OPTIONS, Plan } from "../models/Plan.js";

const normalizeCouponCode = (value) => String(value || "").trim().toUpperCase();

const computeDiscountAmount = ({ listPrice, coupon }) => {
  const safeListPrice = Number.isFinite(Number(listPrice)) ? Number(listPrice) : 0;
  const value = Number.isFinite(Number(coupon?.value)) ? Number(coupon.value) : 0;
  let discountAmount = 0;
  if (coupon?.type === "percent") {
    discountAmount = Math.round((safeListPrice * Math.min(Math.max(value, 0), 100)) / 100);
  } else if (coupon?.type === "amount") {
    discountAmount = Math.round(Math.min(Math.max(value, 0), safeListPrice));
  }
  return Math.max(0, Math.min(discountAmount, safeListPrice));
};

const migrateEmbeddedCouponsForPlanIfNeeded = async ({ gymId, planId }) => {
  const anyCoupons = await Coupon.exists({ gym: gymId, plan: planId });
  if (anyCoupons) return;

  const plan = await Plan.findOne({ _id: planId, gym: gymId }).select("coupons").lean();
  const embedded = Array.isArray(plan?.coupons) ? plan.coupons : [];
  if (!embedded.length) return;

  const writes = [];
  embedded.forEach((row) => {
    const code = normalizeCouponCode(row?.code);
    if (!code) return;
    const value = Number(row?.value);
    if (!Number.isFinite(value) || value <= 0) return;

    const set = {
      gym: gymId,
      plan: planId,
      code,
      type: row?.type === "amount" ? "amount" : "percent",
      value,
      usedCount: row?.usedCount ? Number(row.usedCount) : 0,
      isActive: row?.isActive === false ? false : true,
    };
    if (row?.maxUses) set.maxUses = Number(row.maxUses);
    if (row?.expiresAt) set.expiresAt = new Date(row.expiresAt);

    writes.push({
      updateOne: {
        filter: { gym: gymId, plan: planId, code },
        update: {
          $set: {
            ...set,
          },
        },
        upsert: true,
      },
    });
  });

  if (writes.length) {
    await Coupon.bulkWrite(writes, { ordered: false });
  }
};

const resolveCouponForPlan = async ({ gymId, planId, couponCode }) => {
  const normalizedCode = normalizeCouponCode(couponCode);
  if (!normalizedCode) return null;

  let coupon = await Coupon.findOne({
    gym: gymId,
    plan: planId,
    code: normalizedCode,
    isActive: true,
  }).lean();

  if (!coupon) {
    await migrateEmbeddedCouponsForPlanIfNeeded({ gymId, planId });
    coupon = await Coupon.findOne({
      gym: gymId,
      plan: planId,
      code: normalizedCode,
      isActive: true,
    }).lean();
  }

  if (!coupon) return null;

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const maxUses = typeof coupon.maxUses === "number" ? coupon.maxUses : null;
  const usedCount = typeof coupon.usedCount === "number" ? coupon.usedCount : 0;
  if (maxUses !== null && usedCount >= maxUses) {
    return null;
  }

  return coupon;
};

const reserveCouponUse = async (coupon) => {
  if (!coupon?._id) return false;
  const filter = { _id: coupon._id, isActive: true };
  if (coupon.expiresAt) {
    filter.expiresAt = { $gte: new Date() };
  }
  if (typeof coupon.maxUses === "number") {
    filter.usedCount = { $lt: coupon.maxUses };
  }

  const result = await Coupon.updateOne(filter, { $inc: { usedCount: 1 } });
  return result.modifiedCount > 0;
};

const releaseCouponUse = async (couponId) => {
  if (!couponId) return;
  await Coupon.updateOne({ _id: couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
};

export const computeCouponPricing = async ({ gymId, planId, plan, couponCode }) => {
  const listPrice = typeof plan?.price === "number" ? plan.price : 0;
  const coupon = await resolveCouponForPlan({ gymId, planId, couponCode });
  if (!coupon) {
    return { listPrice, couponCode: "", discountAmount: 0, finalPrice: listPrice, couponId: null, coupon: null };
  }

  const discountAmount = computeDiscountAmount({ listPrice, coupon });
  return {
    listPrice,
    couponCode: coupon.code,
    discountAmount,
    finalPrice: Math.max(0, listPrice - discountAmount),
    couponId: coupon._id,
    coupon,
  };
};

export const validateCouponCode = async ({ gymId, planId, couponCode }) => {
  const normalizedCode = normalizeCouponCode(couponCode);
  const plan = await Plan.findOne({ _id: planId, gym: gymId, isActive: true }).select("price").lean();
  if (!plan) {
    throw new AppError("Plan not found for this gym", StatusCodes.NOT_FOUND);
  }

  const pricing = await computeCouponPricing({ gymId, planId, plan, couponCode: normalizedCode });
  const valid = Boolean(pricing.coupon);
  return {
    valid,
    couponCode: pricing.couponCode,
    listPrice: pricing.listPrice,
    discountAmount: pricing.discountAmount,
    finalPrice: pricing.finalPrice,
    coupon: pricing.coupon
      ? {
          _id: pricing.coupon._id,
          code: pricing.coupon.code,
          type: pricing.coupon.type,
          value: pricing.coupon.value,
        }
      : null,
    reason: normalizedCode && !valid ? "Invalid coupon code." : "",
  };
};

const normalizePlanCoupons = (coupons = [], existingCoupons = []) => {
  if (!Array.isArray(coupons)) return [];
  const usedCountByCode = new Map();
  if (Array.isArray(existingCoupons)) {
    existingCoupons.forEach((row) => {
      const code = normalizeCouponCode(row?.code);
      if (!code) return;
      const usedCount = Number(row?.usedCount);
      usedCountByCode.set(code, Number.isFinite(usedCount) && usedCount >= 0 ? usedCount : 0);
    });
  }
  const map = new Map();

  coupons.forEach((row) => {
    const code = normalizeCouponCode(row?.code);
    if (!code) return;
    if (map.has(code)) return;

    const type = row?.type === "amount" ? "amount" : "percent";
    const value = Number(row?.value);
    if (!Number.isFinite(value) || value <= 0) return;
    const maxUses = Number(row?.maxUses);
    const expiresAt = row?.expiresAt ? new Date(row.expiresAt) : null;

    map.set(code, {
      code,
      type,
      value,
      maxUses: Number.isFinite(maxUses) && maxUses > 0 ? maxUses : undefined,
      expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : undefined,
      isActive: row?.isActive === false ? false : true,
      usedCount: usedCountByCode.get(code) ?? 0,
    });
  });

  return Array.from(map.values());
};

const syncPlanCoupons = async ({ gymId, planId, coupons = [] }) => {
  const existing = await Coupon.find({ gym: gymId, plan: planId }).select("code usedCount").lean();
  const normalized = normalizePlanCoupons(coupons, existing);
  const desiredCodes = new Set(normalized.map((row) => row.code));

  const writes = normalized.map((coupon) => ({
    updateOne: {
      filter: { gym: gymId, plan: planId, code: coupon.code },
      update: {
        $set: {
          gym: gymId,
          plan: planId,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          maxUses: coupon.maxUses,
          expiresAt: coupon.expiresAt,
          isActive: coupon.isActive !== false,
        },
        $setOnInsert: { usedCount: coupon.usedCount || 0 },
      },
      upsert: true,
    },
  }));

  if (writes.length) {
    await Coupon.bulkWrite(writes, { ordered: false });
  }

  // Soft-disable coupons removed from the payload (preserve usedCount).
  await Coupon.updateMany(
    { gym: gymId, plan: planId, ...(desiredCodes.size ? { code: { $nin: Array.from(desiredCodes) } } : {}) },
    { $set: { isActive: false } },
  );
};

const attachCouponsToPlans = async (plans = [], { includeInactive = false, migrateEmbedded = false } = {}) => {
  const planIds = (Array.isArray(plans) ? plans : [])
    .map((plan) => plan?._id)
    .filter(Boolean)
    .map((id) => String(id));

  if (!planIds.length) return plans;

  const couponDocs = await Coupon.find({
    plan: { $in: planIds },
    ...(includeInactive ? {} : { isActive: true }),
  })
    .sort({ createdAt: -1 })
    .lean();

  const byPlanId = new Map();
  couponDocs.forEach((coupon) => {
    const key = coupon?.plan ? String(coupon.plan) : "";
    if (!key) return;
    if (!byPlanId.has(key)) byPlanId.set(key, []);
    byPlanId.get(key).push(coupon);
  });

  if (migrateEmbedded) {
    const migrateWrites = [];
    plans.forEach((plan) => {
      const key = plan?._id ? String(plan._id) : "";
      if (!key) return;
      const hasCoupons = (byPlanId.get(key) || []).length > 0;
      const embedded = Array.isArray(plan?.coupons) ? plan.coupons : [];
      if (hasCoupons || !embedded.length) return;

      const normalized = normalizePlanCoupons(embedded, embedded);
      normalized.forEach((coupon) => {
        migrateWrites.push({
          updateOne: {
            filter: { gym: plan.gym?._id || plan.gym, plan: plan._id, code: coupon.code },
            update: {
              $set: {
                gym: plan.gym?._id || plan.gym,
                plan: plan._id,
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                maxUses: coupon.maxUses,
                expiresAt: coupon.expiresAt,
                isActive: coupon.isActive !== false,
              },
              $setOnInsert: { usedCount: coupon.usedCount || 0 },
            },
            upsert: true,
          },
        });
      });
    });

    if (migrateWrites.length) {
      await Coupon.bulkWrite(migrateWrites, { ordered: false });
      const refreshed = await Coupon.find({
        plan: { $in: planIds },
        ...(includeInactive ? {} : { isActive: true }),
      }).lean();
      byPlanId.clear();
      refreshed.forEach((coupon) => {
        const key = coupon?.plan ? String(coupon.plan) : "";
        if (!key) return;
        if (!byPlanId.has(key)) byPlanId.set(key, []);
        byPlanId.get(key).push(coupon);
      });
    }
  }

  return plans.map((plan) => {
    const key = plan?._id ? String(plan._id) : "";
    const coupons = byPlanId.get(key) || [];
    return { ...plan, coupons };
  });
};

export const getPlans = async (gymId) => {
  const plans = await Plan.find({ isActive: true, ...(gymId ? { gym: gymId } : {}) })
    .select("-coupons")
    .populate("gym", "name location.city")
    .sort({ durationDays: 1, price: 1 })
    .lean();

  return plans;
};

export const createPlan = async ({ actorId, actorRole, gymId, durationKey, customDays, price, features = [], timeSlots = [] }) => {
  const gymFilter = actorRole === "admin" ? { _id: gymId } : { _id: gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id name").lean();

  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const durationConfig = PLAN_DURATION_OPTIONS[durationKey];
  const durationDays = durationKey === "custom" ? customDays : durationConfig.days;
  const durationLabel = durationKey === "custom" ? `${customDays} days` : durationConfig.label;

  const plan = await Plan.create({
    gym: gymId,
    title: `${durationLabel} Membership`,
    durationKey,
    durationLabel,
    durationDays,
    price,
    features,
    timeSlots: Array.isArray(timeSlots) ? timeSlots : [],
  });

  const created = await Plan.findById(plan._id).select("-coupons").populate("gym", "name location.city").lean();
  return created;
};

export const updatePlan = async ({ actorId, actorRole, planId, gymId, durationKey, customDays, price, features = [], timeSlots = [] }) => {
  const gymFilter = actorRole === "admin" ? { _id: gymId } : { _id: gymId, owner: actorId };
  const [gym, plan] = await Promise.all([
    Gym.findOne(gymFilter).select("_id").lean(),
    Plan.findOne({ _id: planId, gym: gymId, isActive: true }),
  ]);

  if (!gym || !plan) {
    throw new AppError("Plan not found for this gym", StatusCodes.NOT_FOUND);
  }

  const durationConfig = PLAN_DURATION_OPTIONS[durationKey];
  const durationDays = durationKey === "custom" ? customDays : durationConfig.days;
  const durationLabel = durationKey === "custom" ? `${customDays} days` : durationConfig.label;

  plan.durationKey = durationKey;
  plan.durationLabel = durationLabel;
  plan.durationDays = durationDays;
  plan.title = `${durationLabel} Membership`;
  plan.price = price;
  plan.features = features;
  plan.timeSlots = Array.isArray(timeSlots) ? timeSlots : [];
  await plan.save();

  const updated = await Plan.findById(planId).select("-coupons").populate("gym", "name location.city").lean();
  return updated;
};

export const removePlan = async ({ actorId, actorRole, planId, gymId }) => {
  const gymFilter = actorRole === "admin" ? { _id: gymId } : { _id: gymId, owner: actorId };
  const [gym, plan] = await Promise.all([
    Gym.findOne(gymFilter).select("_id").lean(),
    Plan.findOne({ _id: planId, gym: gymId, isActive: true }),
  ]);

  if (!gym || !plan) {
    throw new AppError("Plan not found for this gym", StatusCodes.NOT_FOUND);
  }

  plan.isActive = false;
  await plan.save();

  return { planId, removed: true };
};

export const createBooking = async (userId, { planId, gymId, startDate, couponCode, timeSlotId }) => {
  const [plan, gym] = await Promise.all([
    Plan.findOne({ _id: planId, gym: gymId, isActive: true }).lean(),
    Gym.findById(gymId).select("_id name").lean(),
  ]);

  if (!plan || !gym) {
    throw new AppError("Plan or gym not found", StatusCodes.NOT_FOUND);
  }

  const parseStartDate = () => {
    const startsAt = new Date(startDate);
    startsAt.setHours(0, 0, 0, 0);
    return startsAt;
  };

  const resolveSlot = (timeSlotId) => {
    if (!Array.isArray(plan.timeSlots) || !plan.timeSlots.length) {
      return { slot: null, startsAt: parseStartDate() };
    }

    const normalizedSlotId = String(timeSlotId || "").trim();
    if (!normalizedSlotId) {
      throw new AppError("Please select a time slot for this plan", StatusCodes.BAD_REQUEST);
    }

    const slot = plan.timeSlots.find((row) => String(row?._id) === normalizedSlotId) || null;
    if (!slot) {
      throw new AppError("Selected time slot is not valid for this plan", StatusCodes.BAD_REQUEST);
    }

    const startsAt = parseStartDate();
    const [hoursText, minutesText] = String(slot.startTime || "").split(":");
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      throw new AppError("Selected time slot has an invalid start time", StatusCodes.BAD_REQUEST);
    }
    startsAt.setHours(hours, minutes, 0, 0);
    return { slot, startsAt };
  };

  const { slot, startsAt } = resolveSlot(timeSlotId);

  if (Number.isNaN(startsAt.getTime())) {
    throw new AppError("Invalid start date", StatusCodes.BAD_REQUEST);
  }

  const endsAt = new Date(startsAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  if (slot?.capacity) {
    const capacity = Number(slot.capacity);
    if (Number.isFinite(capacity) && capacity > 0) {
      const reservedCount = await Booking.countDocuments({
        gym: gymId,
        plan: planId,
        startsAt,
        status: { $ne: "cancelled" },
      });
      if (reservedCount >= capacity) {
        throw new AppError("This time slot is fully booked", StatusCodes.CONFLICT);
      }
    }
  }

  const pricing = await computeCouponPricing({ gymId, planId, plan, couponCode });
  let reservedCouponId = null;
  if (pricing.coupon) {
    const reserved = await reserveCouponUse(pricing.coupon);
    if (reserved) reservedCouponId = pricing.couponId;
  }

  const finalPricing = reservedCouponId
    ? pricing
    : { ...pricing, couponId: null, couponCode: "", discountAmount: 0, finalPrice: pricing.listPrice };

  try {
    const booking = await Booking.create({
      user: userId,
      gym: gymId,
      plan: planId,
      startsAt,
      endsAt,
      ...(slot
        ? {
            timeSlotId: slot._id,
            slotStartTime: slot.startTime,
            slotDurationMinutes: slot.durationMinutes,
          }
        : {}),
      listPrice: finalPricing.listPrice,
      couponCode: finalPricing.couponCode || undefined,
      discountAmount: finalPricing.discountAmount || undefined,
      finalPrice: finalPricing.finalPrice,
    });

    return booking;
  } catch (error) {
    if (reservedCouponId) {
      await releaseCouponUse(reservedCouponId);
    }
    throw error;
  }


};

export const getMyBookings = async (userId) =>
  (async () => {
    // Keep booking status consistent so expired bookings stop showing as active in the UI.
    await Booking.updateMany(
      { user: userId, status: "active", endsAt: { $lt: new Date() } },
      { $set: { status: "expired" } },
    );

    return Booking.find({ user: userId })
      .populate("gym", "name location")
      .populate("plan", "title durationKey durationLabel durationDays price")
      .sort({ createdAt: -1 })
      .lean();
  })();

export const getAllBookingsAdmin = async () =>
  Booking.find({})
    .populate("user", "fullName email phone role")
    .populate("gym", "name location")
    .populate("plan", "title durationKey durationLabel durationDays price")
    .sort({ createdAt: -1 })
    .lean();
