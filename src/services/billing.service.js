import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";
import { OwnerBillingCoupon } from "../models/OwnerBillingCoupon.js";
import { OwnerBillingPlan } from "../models/OwnerBillingPlan.js";
import { OwnerBillingSettings } from "../models/OwnerBillingSettings.js";
import { OwnerSubscription } from "../models/OwnerSubscription.js";

const DAY_MS = 1000 * 60 * 60 * 24;
const ceilDaysLeft = (targetDate) => {
  if (!targetDate) return null;
  const diff = new Date(targetDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
};

const computeDiscountAmount = ({ basePrice, coupon }) => {
  if (!coupon) return 0;
  if (coupon.type === "amount") {
    return Math.max(0, Math.min(basePrice, Number(coupon.value || 0)));
  }

  const percent = Math.max(0, Math.min(100, Number(coupon.value || 0)));
  return Math.max(0, Math.min(basePrice, (basePrice * percent) / 100));
};

const computeOfferDiscountAmount = ({ basePrice, offer }) => {
  if (!offer) return 0;
  if (offer.type === "amount") {
    return Math.max(0, Math.min(basePrice, Number(offer.value || 0)));
  }

  const percent = Math.max(0, Math.min(100, Number(offer.value || 0)));
  return Math.max(0, Math.min(basePrice, (basePrice * percent) / 100));
};

const validateOwnerCouponCode = async ({ couponCode }) => {
  const coupon = await OwnerBillingCoupon.findOne({ code: String(couponCode).trim().toUpperCase() });
  const now = new Date();
  const isExpired = coupon?.expiresAt && new Date(coupon.expiresAt) <= now;
  const isMaxed = typeof coupon?.maxUses === "number" && coupon.usedCount >= coupon.maxUses;
  if (!coupon || !coupon.isActive || isExpired || isMaxed) {
    throw new AppError("Invalid or expired coupon", StatusCodes.BAD_REQUEST);
  }
  return coupon;
};

export const ensureOwnerSubscription = async (ownerId) => {
  const existing = await OwnerSubscription.findOne({ owner: ownerId });
  if (existing) return existing;
  return OwnerSubscription.create({ owner: ownerId, status: "pending" });
};

export const getOwnerBillingSettings = async () => {
  const existing = await OwnerBillingSettings.findOne({});
  if (existing) return existing.toObject ? existing.toObject() : existing;
  const created = await OwnerBillingSettings.create({});
  return created.toObject();
};

export const updateOwnerBillingSettings = async (payload) => {
  const normalized = {
    ...payload,
    ...(payload.welcomeOfferMessage === "" ? { welcomeOfferMessage: "" } : {}),
  };
  const settings = await OwnerBillingSettings.findOneAndUpdate({}, normalized, { new: true, upsert: true });
  return settings.toObject();
};

export const listOwnerBillingPlansForOwner = async () => {
  return OwnerBillingPlan.find({ isActive: true }).sort({ isDefault: -1, sortOrder: 1, price: 1 }).lean();
};

export const listOwnerBillingPlansForAdmin = async () => {
  return OwnerBillingPlan.find({}).sort({ isActive: -1, isDefault: -1, sortOrder: 1, price: 1 }).lean();
};

export const getOwnerSubscriptionStatus = async (ownerId) => {
  const subscription = await ensureOwnerSubscription(ownerId);
  const now = new Date();

  const isTrialExpired = subscription.status === "trial" && subscription.trialEndsAt && new Date(subscription.trialEndsAt) <= now;
  const isActiveExpired = subscription.status === "active" && subscription.endsAt && new Date(subscription.endsAt) <= now;
  if (isTrialExpired || isActiveExpired) {
    await OwnerSubscription.updateOne(
      { _id: subscription._id },
      { $set: { status: "expired" } },
    );
  }

  const populated = await OwnerSubscription.findById(subscription._id).populate("plan").lean();

  const dueAt =
    populated.status === "trial"
      ? populated.trialEndsAt || null
      : populated.status === "active"
        ? populated.endsAt || null
        : populated.nextDueAt || populated.endsAt || populated.trialEndsAt || null;

  const isInGoodStanding =
    populated.status === "active"
      ? Boolean(populated.endsAt && new Date(populated.endsAt) > now)
      : populated.status === "trial"
        ? Boolean(populated.trialEndsAt && new Date(populated.trialEndsAt) > now)
        : false;

  const remainingDays = dueAt ? ceilDaysLeft(dueAt) : null;

  const settings = await getOwnerBillingSettings();
  const offerIsValid =
    Boolean(settings?.welcomeOfferEnabled) &&
    Number(settings?.welcomeOfferValue || 0) > 0 &&
    (!settings?.welcomeOfferExpiresAt || new Date(settings.welcomeOfferExpiresAt) > now);

  const isEligibleForWelcomeOffer =
    offerIsValid &&
    populated.status === "pending" &&
    !populated.welcomeOfferConsumedAt &&
    !populated.trialUsedAt;

  const welcomeOffer = isEligibleForWelcomeOffer
    ? {
        type: settings.welcomeOfferType || "percent",
        value: Number(settings.welcomeOfferValue || 0),
        allowTrial: Boolean(settings.welcomeOfferAllowTrial),
        message: String(settings.welcomeOfferMessage || "").trim() || null,
        expiresAt: settings.welcomeOfferExpiresAt || null,
      }
    : null;

  const trialDays = settings?.trialEnabled ? Math.max(0, Number(settings?.trialDays || 0)) : 0;
  const trialPayLaterEnabled = typeof settings?.trialPayLaterEnabled === "boolean"
    ? settings.trialPayLaterEnabled
    : Boolean(settings?.welcomeOfferAllowTrial);
  const trialEligible =
    populated.status === "pending" &&
    !populated.trialUsedAt &&
    !populated.welcomeOfferConsumedAt &&
    trialDays > 0;

  return {
    subscription: populated,
    dueAt,
    remainingDays,
    isInGoodStanding,
    welcomeOffer,
    reminderDays: Number.isFinite(Number(settings?.renewalReminderDays))
      ? Number(settings.renewalReminderDays)
      : 7,
    trialDays,
    trialPayLaterEnabled: Boolean(trialPayLaterEnabled),
    trialEligible,
  };
};

export const startOwnerTrial = async (ownerId, { planId }) => {
  const plan = await OwnerBillingPlan.findOne({ _id: planId, isActive: true }).lean();
  if (!plan) {
    throw new AppError("Billing plan not found", StatusCodes.NOT_FOUND);
  }

  const settings = await getOwnerBillingSettings();
  const trialDays = Math.max(0, Number(settings?.trialDays || 0));
  const payLaterEnabled = typeof settings?.trialPayLaterEnabled === "boolean"
    ? settings.trialPayLaterEnabled
    : Boolean(settings?.welcomeOfferAllowTrial);

  if (!settings?.trialEnabled || trialDays < 1 || !payLaterEnabled) {
    throw new AppError("Pay later is not available right now", StatusCodes.BAD_REQUEST);
  }

  const subscription = await ensureOwnerSubscription(ownerId);
  if (subscription.trialUsedAt) {
    throw new AppError("Trial has already been used", StatusCodes.BAD_REQUEST);
  }

  if (subscription.status !== "pending") {
    throw new AppError("Trial is only available before first activation", StatusCodes.BAD_REQUEST);
  }

  const trialEndsAt = new Date(Date.now() + trialDays * DAY_MS);

  subscription.plan = plan._id;
  subscription.status = "trial";
  subscription.trialUsedAt = new Date();
  subscription.welcomeOfferConsumedAt = subscription.welcomeOfferConsumedAt || new Date();
  subscription.trialEndsAt = trialEndsAt;
  subscription.endsAt = undefined;
  subscription.nextDueAt = trialEndsAt;

  await subscription.save();
  return getOwnerSubscriptionStatus(ownerId);
};

export const payOwnerSubscription = async (ownerId, { planId, couponCode }) => {
  const plan = await OwnerBillingPlan.findOne({ _id: planId, isActive: true }).lean();
  if (!plan) {
    throw new AppError("Billing plan not found", StatusCodes.NOT_FOUND);
  }

  const status = await getOwnerSubscriptionStatus(ownerId);
  const welcomeOffer = status.welcomeOffer;
  const trialBonusDays = status.trialEligible ? Math.max(0, Number(status.trialDays || 0)) : 0;

  let coupon = null;
  if (couponCode && !welcomeOffer) {
    coupon = await validateOwnerCouponCode({ couponCode });
  }

  const basePrice = Number(plan.price || 0);
  const discountAmount = welcomeOffer
    ? computeOfferDiscountAmount({ basePrice, offer: welcomeOffer })
    : computeDiscountAmount({ basePrice, coupon });
  const finalPrice = Math.max(0, basePrice - discountAmount);
  const bonusDays = coupon ? Math.max(0, Number(coupon.bonusDays || 0)) : 0;
  const endsAt = new Date(Date.now() + (plan.durationDays + bonusDays + trialBonusDays) * DAY_MS);

  const subscription = await ensureOwnerSubscription(ownerId);
  subscription.plan = plan._id;
  subscription.status = "active";
  subscription.trialEndsAt = undefined;
  subscription.endsAt = endsAt;
  subscription.nextDueAt = endsAt;
  subscription.lastPayment = {
    paidAt: new Date(),
    amountPaid: finalPrice,
    currency: plan.currency,
    couponCode: coupon ? coupon.code : undefined,
    offer: welcomeOffer ? { type: welcomeOffer.type, value: welcomeOffer.value } : undefined,
    discountAmount,
    bonusDays: bonusDays + trialBonusDays,
  };
  if (welcomeOffer) {
    subscription.welcomeOfferConsumedAt = subscription.welcomeOfferConsumedAt || new Date();
  }
  if (trialBonusDays > 0) {
    subscription.trialUsedAt = subscription.trialUsedAt || new Date();
    subscription.welcomeOfferConsumedAt = subscription.welcomeOfferConsumedAt || new Date();
  }

  if (coupon) {
    subscription.couponHistory = [
      ...(Array.isArray(subscription.couponHistory) ? subscription.couponHistory : []),
      {
        code: coupon.code,
        appliedAt: new Date(),
        discountAmount,
        bonusDays,
      },
    ];
  }

  await subscription.save();

  if (coupon) {
    await OwnerBillingCoupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
  }

  return getOwnerSubscriptionStatus(ownerId);
};

export const previewOwnerPayment = async (ownerId, { planId, couponCode }) => {
  const plan = await OwnerBillingPlan.findOne({ _id: planId, isActive: true }).lean();
  if (!plan) {
    throw new AppError("Billing plan not found", StatusCodes.NOT_FOUND);
  }

  const status = await getOwnerSubscriptionStatus(ownerId);
  const welcomeOffer = status.welcomeOffer;
  const trialBonusDays = status.trialEligible ? Math.max(0, Number(status.trialDays || 0)) : 0;

  let coupon = null;
  if (couponCode && !welcomeOffer) {
    coupon = await validateOwnerCouponCode({ couponCode });
  }

  const basePrice = Number(plan.price || 0);
  const discountAmount = welcomeOffer
    ? computeOfferDiscountAmount({ basePrice, offer: welcomeOffer })
    : computeDiscountAmount({ basePrice, coupon });
  const finalPrice = Math.max(0, basePrice - discountAmount);
  const couponBonusDays = coupon ? Math.max(0, Number(coupon.bonusDays || 0)) : 0;

  return {
    plan: {
      id: plan._id.toString(),
      currency: plan.currency,
      price: basePrice,
      durationDays: Number(plan.durationDays || 0),
    },
    applied: welcomeOffer
      ? { kind: "welcomeOffer", type: welcomeOffer.type, value: welcomeOffer.value }
      : coupon
        ? { kind: "coupon", code: coupon.code, type: coupon.type, value: coupon.value, bonusDays: couponBonusDays }
        : null,
    trialBonusDays,
    discountAmount,
    finalPrice,
    totalAccessDays: Number(plan.durationDays || 0) + trialBonusDays + couponBonusDays,
  };
};

export const createOwnerBillingPlan = async (payload) => {
  const normalized = {
    ...payload,
    ...(payload.description === "" ? { description: undefined } : {}),
    ...(payload.currency === "" ? { currency: undefined } : {}),
  };
  const plan = await OwnerBillingPlan.create(normalized);
  if (plan.isDefault) {
    await OwnerBillingPlan.updateMany({ _id: { $ne: plan._id } }, { $set: { isDefault: false } });
  }
  return plan.toObject();
};

export const updateOwnerBillingPlan = async (planId, payload) => {
  const normalized = {
    ...payload,
    ...(payload.description === "" ? { description: undefined } : {}),
    ...(payload.currency === "" ? { currency: undefined } : {}),
  };
  const plan = await OwnerBillingPlan.findByIdAndUpdate(planId, normalized, { new: true });
  if (!plan) {
    throw new AppError("Billing plan not found", StatusCodes.NOT_FOUND);
  }

  if (plan.isDefault) {
    await OwnerBillingPlan.updateMany({ _id: { $ne: plan._id } }, { $set: { isDefault: false } });
  }

  return plan.toObject();
};

export const deleteOwnerBillingPlan = async (planId) => {
  const plan = await OwnerBillingPlan.findByIdAndDelete(planId);
  if (!plan) {
    throw new AppError("Billing plan not found", StatusCodes.NOT_FOUND);
  }
  return { id: plan._id.toString() };
};

export const listOwnerBillingCouponsForAdmin = async () => {
  return OwnerBillingCoupon.find({}).sort({ isActive: -1, createdAt: -1 }).lean();
};

export const createOwnerBillingCoupon = async (payload) => {
  try {
    const normalized = {
      ...payload,
      code: String(payload.code || "").trim().toUpperCase(),
    };
    const coupon = await OwnerBillingCoupon.create(normalized);
    return coupon.toObject();
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError("Coupon code already exists", StatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const updateOwnerBillingCoupon = async (couponId, payload) => {
  const normalized = {
    ...payload,
    ...(payload.code ? { code: String(payload.code).trim().toUpperCase() } : {}),
  };
  const coupon = await OwnerBillingCoupon.findByIdAndUpdate(couponId, normalized, { new: true });
  if (!coupon) {
    throw new AppError("Coupon not found", StatusCodes.NOT_FOUND);
  }
  return coupon.toObject();
};

export const deleteOwnerBillingCoupon = async (couponId) => {
  const coupon = await OwnerBillingCoupon.findByIdAndDelete(couponId);
  if (!coupon) {
    throw new AppError("Coupon not found", StatusCodes.NOT_FOUND);
  }
  return { id: coupon._id.toString() };
};
