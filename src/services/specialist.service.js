import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";
import { Booking } from "../models/Booking.js";
import { Gym } from "../models/Gym.js";
import { User } from "../models/User.js";
import { UserProfile } from "../models/UserProfile.js";
import { SpecialistPlan } from "../models/SpecialistPlan.js";
import { SpecialistRequest } from "../models/SpecialistRequest.js";
import { SpecialistService } from "../models/SpecialistService.js";

const pickTierPrice = (tiers = [], applicationsCount) => {
  const sorted = (tiers || [])
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

  if (!sorted.length) return null;

  let selected = sorted[0];
  sorted.forEach((tier) => {
    if (applicationsCount >= tier.minApplications) {
      selected = tier;
    }
  });

  return selected.pricePerApplication;
};

export const listServicesWithPlans = async () => {
  const services = await SpecialistService.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  const serviceIds = services.map((service) => service._id);
  const plans = await SpecialistPlan.find({ service: { $in: serviceIds }, isActive: true }).sort({ createdAt: -1 }).lean();

  const planMap = new Map();
  plans.forEach((plan) => {
    const key = String(plan.service);
    const current = planMap.get(key) || [];
    current.push(plan);
    planMap.set(key, current);
  });

  return services.map((service) => ({
    ...service,
    plans: planMap.get(String(service._id)) || [],
  }));
};

export const createRequest = async (ownerId, ownerRole, payload) => {
  const gymFilter = ownerRole === "admin" ? { _id: payload.gymId } : { _id: payload.gymId, owner: ownerId };
  const gym = await Gym.findOne(gymFilter).select("_id owner name").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const [service, plan] = await Promise.all([
    SpecialistService.findOne({ _id: payload.serviceId, isActive: true }).lean(),
    SpecialistPlan.findOne({ _id: payload.planId, isActive: true }).lean(),
  ]);

  if (!service) {
    throw new AppError("Service not found", StatusCodes.NOT_FOUND);
  }

  if (!plan || String(plan.service) !== String(payload.serviceId)) {
    throw new AppError("Plan not found for this service", StatusCodes.NOT_FOUND);
  }

  const memberIds = Array.isArray(payload.memberIds) ? payload.memberIds.map(String) : [];
  const uniqueMemberIds = Array.from(new Set(memberIds.filter(Boolean)));
  if (!uniqueMemberIds.length) {
    throw new AppError("Select at least one member", StatusCodes.BAD_REQUEST);
  }

  const applicationsCount = uniqueMemberIds.length;

  const pricePerApplication = pickTierPrice(plan.pricingTiers, applicationsCount);
  if (pricePerApplication === null) {
    throw new AppError("Plan pricing tiers are not configured", StatusCodes.BAD_REQUEST);
  }

  const eligibleMemberIds = await Booking.find({ gym: payload.gymId, user: { $in: uniqueMemberIds } })
    .distinct("user");

  if (eligibleMemberIds.length !== uniqueMemberIds.length) {
    throw new AppError("One or more selected members are not associated with this gym", StatusCodes.BAD_REQUEST);
  }

  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: uniqueMemberIds } }).select("_id fullName phone email").lean(),
    UserProfile.find({ user: { $in: uniqueMemberIds } }).lean(),
  ]);

  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const profileMap = new Map(profiles.map((p) => [String(p.user), p]));

  const memberProfiles = uniqueMemberIds.map((userId) => {
    const u = userMap.get(String(userId));
    const p = profileMap.get(String(userId));
    return {
      userId,
      fullName: u?.fullName,
      phone: u?.phone,
      email: u?.email,
      profile: p
        ? {
            age: p.age,
            gender: p.gender,
            fitnessGoal: p.fitnessGoal,
            occupationType: p.occupationType,
            heightCm: p.heightCm,
            weightKg: p.weightKg,
            bodyType: p.bodyType,
            fatDistributionType: p.fatDistributionType,
            medicalNotes: p.medicalNotes,
          }
        : null,
    };
  });

  const currency = plan.currency || "INR";
  const totalPrice = Number((pricePerApplication * applicationsCount).toFixed(2));

  const request = await SpecialistRequest.create({
    gym: gym._id,
    owner: ownerId,
    service: service._id,
    plan: plan._id,
    memberProfiles,
    applicationsCount,
    currency,
    pricePerApplication,
    totalPrice,
    note: payload.note || undefined,
  });

  return SpecialistRequest.findById(request._id)
    .populate("gym", "name")
    .populate("service", "name type")
    .populate("plan", "title currency pricingTiers")
    .lean();
};

export const listOwnerRequests = async (ownerId, ownerRole, gymId) => {
  let filter = { owner: ownerId };
  if (ownerRole === "admin") {
    filter = {};
  }

  if (gymId) {
    filter.gym = gymId;
  }

  return SpecialistRequest.find(filter)
    .populate("gym", "name")
    .populate("service", "name type")
    .populate("plan", "title currency pricingTiers")
    .sort({ createdAt: -1 })
    .lean();
};

export const listServiceRequestsAdmin = async (serviceId) => {
  const filter = serviceId ? { service: serviceId } : {};
  return SpecialistRequest.find(filter)
    .populate("gym", "name")
    .populate("owner", "fullName phone")
    .populate("service", "name type")
    .populate("plan", "title currency pricingTiers")
    .sort({ createdAt: -1 })
    .lean();
};

export const setRequestStatusAdmin = async (requestId, status) => {
  const request = await SpecialistRequest.findOneAndUpdate(
    { _id: requestId },
    { $set: { status } },
    { new: true, runValidators: true },
  )
    .populate("gym", "name")
    .populate("owner", "fullName phone")
    .populate("service", "name type")
    .populate("plan", "title currency pricingTiers")
    .lean();

  if (!request) {
    throw new AppError("Request not found", StatusCodes.NOT_FOUND);
  }

  return request;
};
