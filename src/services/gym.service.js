import crypto from "crypto";
import QRCode from "qrcode";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";
import { AppError } from "../errors/AppError.js";
import { Booking } from "../models/Booking.js";
import { Coupon } from "../models/Coupon.js";
import { Equipment } from "../models/Equipment.js";
import { Gym } from "../models/Gym.js";
import { Otp } from "../models/Otp.js";
import { Plan } from "../models/Plan.js";
import { Transaction } from "../models/Transaction.js";
import { TrainerRequest } from "../models/TrainerRequest.js";
import { TrainerProfile } from "../models/TrainerProfile.js";
import { UserProfile } from "../models/UserProfile.js";
import { User } from "../models/User.js";
import { WorkoutSession } from "../models/WorkoutSession.js";
import { isEmailDeliveryConfigured, sendBookingInvoiceEmail, sendOtpEmail } from "./email.service.js";
import { generateOtpCode } from "./otp.service.js";
import * as planService from "./plan.service.js";
import * as transactionService from "./transaction.service.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const buildExpiresAt = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

const hashAssetKey = (assetKey, salt) =>
  crypto.pbkdf2Sync(String(assetKey || ""), String(salt || ""), 120000, 32, "sha256").toString("hex");

export const verifyGymAssetAccess = async ({ gymId, assetId, assetKey }) => {
  const normalizedAssetId = String(assetId || "").trim();
  const normalizedAssetKey = String(assetKey || "").trim();

  if (!normalizedAssetId || !normalizedAssetKey) {
    throw new AppError("Asset ID and Asset Key are required", StatusCodes.UNAUTHORIZED);
  }

  const gymSecrets = await Gym.findById(gymId)
    .select("owner assetId assetKeySalt assetKeyHash assetPermissions isActive")
    .lean();

  if (!gymSecrets || gymSecrets.isActive === false) {
    throw new AppError("Gym not found", StatusCodes.NOT_FOUND);
  }

  if (!gymSecrets.assetId || !gymSecrets.assetKeySalt || !gymSecrets.assetKeyHash) {
    throw new AppError("Asset access is not enabled for this gym", StatusCodes.UNAUTHORIZED);
  }

  const expectedHash = hashAssetKey(normalizedAssetKey, gymSecrets.assetKeySalt);
  if (String(gymSecrets.assetId).trim() !== normalizedAssetId || expectedHash !== gymSecrets.assetKeyHash) {
    throw new AppError("Invalid asset credentials", StatusCodes.UNAUTHORIZED);
  }

  return gymSecrets;
};

const normalizePermissionLevel = (value) => {
  if (value === false || value === 0 || value === "none") return 0;
  if (value === true || value === 2 || value === "edit") return 2;
  if (value === 1 || value === "view") return 1;
  return 0;
};

export const assertAssetPermission = (gymSecrets, permissionKey, required = "edit") => {
  const level = normalizePermissionLevel(gymSecrets?.assetPermissions?.[permissionKey]);
  const requiredLevel = required === "view" ? 1 : 2;
  if (level < requiredLevel) {
    throw new AppError("Asset access is not allowed for this section", StatusCodes.FORBIDDEN);
  }
};

export const createGym = async (ownerId, payload) => {
  const assetId = String(payload.assetId || "").trim();
  const assetKey = String(payload.assetKey || "").trim();
  const assetKeySalt = assetId && assetKey ? crypto.randomBytes(16).toString("hex") : "";
  const assetKeyHash = assetId && assetKey ? hashAssetKey(assetKey, assetKeySalt) : "";

  const gym = await Gym.create({
    owner: ownerId,
    name: payload.name,
    slug: `${slugify(payload.name)}-${crypto.randomBytes(2).toString("hex")}`,
    assetId,
    assetKeySalt,
    assetKeyHash,
    location: payload.location,
    amenities: payload.amenities || [],
    qrToken: crypto.randomUUID(),
  });

  const result = gym.toObject();
  delete result.assetKeySalt;
  delete result.assetKeyHash;
  return result;
};

export const getOwnerGyms = async (ownerId) =>
  Gym.find({ owner: ownerId, isActive: true })
    .select("-assetKeySalt -assetKeyHash")
    .populate("trainers", "fullName phone role")
    .sort({ createdAt: -1 })
    .lean();

export const getAllGymsAdmin = async () =>
  Gym.find({})
    .select("-assetKeySalt -assetKeyHash")
    .populate("owner", "fullName email phone")
    .populate("trainers", "fullName email phone role")
    .sort({ createdAt: -1 })
    .lean();

export const getOwnerAnalytics = async (ownerId, daysParam) => {
  const days = Number.isFinite(Number(daysParam)) ? Math.min(Math.max(Number(daysParam), 7), 365) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);
  const seriesEnd = new Date();
  seriesEnd.setUTCHours(0, 0, 0, 0);
  const seriesStart = new Date(seriesEnd.getTime() - Math.max(days - 1, 0) * 24 * 60 * 60 * 1000);
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const memberRiskNearExpiryDays = 7;
  const memberRiskLastVisitDays = 5;
  const memberRiskLowMinutes7d = 30;
  const memberRiskIrregularWindowDays = 14;
  const memberRiskIrregularGapDays = 4;

  const workoutSince7 = new Date(now.getTime() - 7 * oneDayMs);
  workoutSince7.setUTCHours(0, 0, 0, 0);
  const workoutSince14 = new Date(now.getTime() - memberRiskIrregularWindowDays * oneDayMs);
  workoutSince14.setUTCHours(0, 0, 0, 0);
  const nearExpiryUntil = new Date(now.getTime() + memberRiskNearExpiryDays * oneDayMs);

  const gyms = await Gym.find({ owner: ownerId })
    .select("_id name isActive location trainers createdAt")
    .lean();

  const gymIds = gyms.map((gym) => gym._id);
  if (!gymIds.length) {
    return {
      windowDays: days,
      summary: {
        gymsCount: 0,
        activeGymsCount: 0,
        trainersCount: 0,
        membersCount: 0,
        activeMembersCount: 0,
        bookingsCount: 0,
        activeBookingsCount: 0,
        revenueTotal: 0,
        revenueActive: 0,
        bookingsWindowCount: 0,
        revenueWindow: 0,
      },
      accounts: {
        windowDays: days,
        window: { incomePaid: 0, expensePaid: 0, netPaid: 0, count: 0 },
        prevWindow: { incomePaid: 0, expensePaid: 0, netPaid: 0, count: 0 },
        series: [],
      },
      membersRisk: {
        thresholds: {
          nearExpiryDays: memberRiskNearExpiryDays,
          lastVisitDays: memberRiskLastVisitDays,
          lowMinutes7d: memberRiskLowMinutes7d,
          irregularWindowDays: memberRiskIrregularWindowDays,
          irregularGapDays: memberRiskIrregularGapDays,
        },
        members: [],
      },
      gyms: [],
      trainers: [],
    };
  }

  const [
    bookingAgg,
    uniqueMembersAgg,
    overallMembersAgg,
    windowAgg,
    transactionWindowAgg,
    transactionPrevAgg,
    transactionSeriesAgg,
    memberBookingsAgg,
    memberLastVisitAgg,
    memberMinutes7Agg,
    memberDays14Agg,
  ] = await Promise.all([
    Booking.aggregate([
      { $match: { gym: { $in: gymIds } } },
      { $lookup: { from: "plans", localField: "plan", foreignField: "_id", as: "planDoc" } },
      { $unwind: { path: "$planDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$gym",
          bookingsCount: { $sum: 1 },
          activeBookingsCount: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          revenueTotal: { $sum: { $ifNull: ["$planDoc.price", 0] } },
          revenueActive: {
            $sum: {
              $cond: [{ $eq: ["$status", "active"] }, { $ifNull: ["$planDoc.price", 0] }, 0],
            },
          },
          lastBookingAt: { $max: "$createdAt" },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { gym: { $in: gymIds } } },
      {
        $group: {
          _id: { gym: "$gym", user: "$user" },
          hasActive: { $max: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        },
      },
      {
        $group: {
          _id: "$_id.gym",
          membersCount: { $sum: 1 },
          activeMembersCount: { $sum: "$hasActive" },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { gym: { $in: gymIds } } },
      {
        $group: {
          _id: "$user",
          hasActive: { $max: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        },
      },
      {
        $group: {
          _id: null,
          membersCount: { $sum: 1 },
          activeMembersCount: { $sum: "$hasActive" },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { gym: { $in: gymIds }, createdAt: { $gte: since } } },
      { $lookup: { from: "plans", localField: "plan", foreignField: "_id", as: "planDoc" } },
      { $unwind: { path: "$planDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$gym",
          bookingsWindowCount: { $sum: 1 },
          revenueWindow: { $sum: { $ifNull: ["$planDoc.price", 0] } },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { gym: { $in: gymIds }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$accountType",
          paidAmount: { $sum: { $ifNull: ["$paidAmount", 0] } },
          totalAmount: { $sum: { $ifNull: ["$totalAmount", 0] } },
          entriesCount: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { gym: { $in: gymIds }, createdAt: { $gte: prevSince, $lt: since } } },
      {
        $group: {
          _id: "$accountType",
          paidAmount: { $sum: { $ifNull: ["$paidAmount", 0] } },
          totalAmount: { $sum: { $ifNull: ["$totalAmount", 0] } },
          entriesCount: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { gym: { $in: gymIds }, createdAt: { $gte: seriesStart } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: "$accountType",
          },
          paidAmount: { $sum: { $ifNull: ["$paidAmount", 0] } },
        },
      },
      {
        $group: {
          _id: "$_id.day",
          incomePaid: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "income"] }, "$paidAmount", 0],
            },
          },
          expensePaid: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "expense"] }, "$paidAmount", 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      { $match: { gym: { $in: gymIds } } },
      {
        $group: {
          _id: { gym: "$gym", user: "$user" },
          activeEndsAt: {
            $max: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "active"] },
                    { $gte: ["$endsAt", now] },
                  ],
                },
                "$endsAt",
                null,
              ],
            },
          },
          lastBookingEndsAt: { $max: "$endsAt" },
          lastBookingCreatedAt: { $max: "$createdAt" },
        },
      },
    ]),
    WorkoutSession.aggregate([
      { $match: { gym: { $in: gymIds } } },
      {
        $group: {
          _id: { gym: "$gym", member: "$member" },
          lastVisitAt: { $max: { $ifNull: ["$endedAt", "$startedAt"] } },
        },
      },
    ]),
    WorkoutSession.aggregate([
      { $match: { gym: { $in: gymIds }, startedAt: { $gte: workoutSince7 } } },
      { $unwind: { path: "$exercises", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { gym: "$gym", member: "$member" },
          minutes7d: { $sum: { $ifNull: ["$exercises.durationMinutes", 0] } },
        },
      },
    ]),
    WorkoutSession.aggregate([
      { $match: { gym: { $in: gymIds }, startedAt: { $gte: workoutSince14 } } },
      {
        $project: {
          gym: 1,
          member: 1,
          dayKey: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } },
        },
      },
      {
        $group: {
          _id: { gym: "$gym", member: "$member", dayKey: "$dayKey" },
        },
      },
      {
        $group: {
          _id: { gym: "$_id.gym", member: "$_id.member" },
          dayKeys: { $push: "$_id.dayKey" },
          daysCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const bookingMap = new Map(bookingAgg.map((row) => [String(row._id), row]));
  const membersMap = new Map(uniqueMembersAgg.map((row) => [String(row._id), row]));
  const windowMap = new Map(windowAgg.map((row) => [String(row._id), row]));
  const overallMembers = Array.isArray(overallMembersAgg) && overallMembersAgg.length ? overallMembersAgg[0] : null;

  const getAccountTotals = (agg = []) => {
    const incomeRow = agg.find((row) => row && row._id === "income") || {};
    const expenseRow = agg.find((row) => row && row._id === "expense") || {};
    const incomePaid = Number(incomeRow.paidAmount || 0);
    const expensePaid = Number(expenseRow.paidAmount || 0);
    const count = Number(incomeRow.entriesCount || 0) + Number(expenseRow.entriesCount || 0);
    return { incomePaid, expensePaid, netPaid: incomePaid - expensePaid, count };
  };

  const seriesRowMap = new Map((transactionSeriesAgg || []).map((row) => [String(row._id), row]));
  const transactionSeries = Array.from({ length: days }, (_value, index) => {
    const date = new Date(seriesStart.getTime() + index * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().slice(0, 10);
    const row = seriesRowMap.get(dateKey) || {};
    return {
      dateKey,
      incomePaid: Number(row.incomePaid || 0),
      expensePaid: Number(row.expensePaid || 0),
    };
  });

  const gymNameById = new Map(gyms.map((gym) => [String(gym._id), gym?.name || "Gym"]));

  const memberBookingMap = new Map(
    (Array.isArray(memberBookingsAgg) ? memberBookingsAgg : []).map((row) => [
      `${String(row?._id?.gym)}:${String(row?._id?.user)}`,
      row,
    ]),
  );
  const memberLastVisitMap = new Map(
    (Array.isArray(memberLastVisitAgg) ? memberLastVisitAgg : []).map((row) => [
      `${String(row?._id?.gym)}:${String(row?._id?.member)}`,
      row,
    ]),
  );
  const memberMinutes7Map = new Map(
    (Array.isArray(memberMinutes7Agg) ? memberMinutes7Agg : []).map((row) => [
      `${String(row?._id?.gym)}:${String(row?._id?.member)}`,
      row,
    ]),
  );
  const memberDays14Map = new Map(
    (Array.isArray(memberDays14Agg) ? memberDays14Agg : []).map((row) => [
      `${String(row?._id?.gym)}:${String(row?._id?.member)}`,
      row,
    ]),
  );

  const uniqueMemberIds = Array.from(
    new Set(
      (Array.isArray(memberBookingsAgg) ? memberBookingsAgg : [])
        .map((row) => String(row?._id?.user || ""))
        .filter(Boolean),
    ),
  );

  const memberIdObjects = uniqueMemberIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const membersUsers = memberIdObjects.length
    ? await User.find({ _id: { $in: memberIdObjects } }).select("_id fullName phone email").lean()
    : [];

  const memberUserMap = new Map(membersUsers.map((u) => [String(u._id), u]));

  const parseDayKeyUtc = (dayKey) => new Date(`${String(dayKey || "").slice(0, 10)}T00:00:00.000Z`).getTime();

  const computeIrregular = (dayKeys = []) => {
    const keys = (Array.isArray(dayKeys) ? dayKeys : []).map((k) => String(k)).filter(Boolean);
    if (keys.length < 2) return { irregular: false, maxGapDays: 0, daysCount: keys.length };
    const times = keys
      .map((k) => parseDayKeyUtc(k))
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b);
    const uniqueTimes = Array.from(new Set(times));
    if (uniqueTimes.length < 2) return { irregular: false, maxGapDays: 0, daysCount: uniqueTimes.length };
    let maxGapDays = 0;
    for (let i = 1; i < uniqueTimes.length; i += 1) {
      const gap = Math.round((uniqueTimes[i] - uniqueTimes[i - 1]) / oneDayMs);
      if (gap > maxGapDays) maxGapDays = gap;
    }

    const daysCount = uniqueTimes.length;
    const irregular =
      daysCount >= 2 &&
      daysCount <= 4 &&
      maxGapDays >= memberRiskIrregularGapDays;

    return { irregular, maxGapDays, daysCount };
  };

  const membersRiskRows = (Array.isArray(memberBookingsAgg) ? memberBookingsAgg : [])
    .map((row) => {
      const gymId = String(row?._id?.gym || "");
      const memberId = String(row?._id?.user || "");
      if (!gymId || !memberId) return null;
      const key = `${gymId}:${memberId}`;

      const memberUser = memberUserMap.get(memberId) || {};
      const activeEndsAt = row?.activeEndsAt instanceof Date ? row.activeEndsAt : null;
      const membershipEndsAt = activeEndsAt && !Number.isNaN(activeEndsAt.getTime()) ? activeEndsAt : null;

      const lastVisitRow = memberLastVisitMap.get(key) || {};
      const lastVisitAtRaw = lastVisitRow?.lastVisitAt ? new Date(lastVisitRow.lastVisitAt) : null;
      const lastVisitAt =
        lastVisitAtRaw && !Number.isNaN(lastVisitAtRaw.getTime()) ? lastVisitAtRaw : null;

      const minutesRow = memberMinutes7Map.get(key) || {};
      const minutes7d = Number(minutesRow?.minutes7d || 0);

      const daysRow = memberDays14Map.get(key) || {};
      const { irregular, maxGapDays, daysCount } = computeIrregular(daysRow?.dayKeys || []);

      const reasons = [];
      let triggers = 0;

      const nearExpiry =
        membershipEndsAt &&
        membershipEndsAt.getTime() <= nearExpiryUntil.getTime() &&
        membershipEndsAt.getTime() >= now.getTime();
      if (nearExpiry) {
        triggers += 1;
        const daysLeft = Math.max(0, Math.ceil((membershipEndsAt.getTime() - now.getTime()) / oneDayMs));
        reasons.push(`Membership ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`);
      }

      const lastVisitStale = !lastVisitAt || now.getTime() - lastVisitAt.getTime() > memberRiskLastVisitDays * oneDayMs;
      if (lastVisitStale) {
        triggers += 1;
        if (!lastVisitAt) reasons.push("No workout session yet");
        else {
          const daysAgo = Math.floor((now.getTime() - lastVisitAt.getTime()) / oneDayMs);
          reasons.push(`Last visit ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`);
        }
      }

      const lowMinutes = Number.isFinite(minutes7d) ? minutes7d < memberRiskLowMinutes7d : true;
      if (lowMinutes) {
        triggers += 1;
        reasons.push(`Only ${Math.round(minutes7d || 0)} min in last 7 days`);
      }

      if (irregular) {
        triggers += 1;
        reasons.push(`Not regular (visited ${daysCount} days, gap ${maxGapDays} days)`);
      }

      const riskLevel = triggers >= 2 ? "high" : triggers === 1 ? "medium" : "low";

      return {
        gymId,
        gymName: gymNameById.get(gymId) || "Gym",
        memberId,
        fullName: memberUser.fullName || "",
        phone: memberUser.phone || "",
        email: memberUser.email || "",
        membershipEndsAt: membershipEndsAt || null,
        lastVisitAt: lastVisitAt || null,
        minutes7d: Number.isFinite(minutes7d) ? minutes7d : 0,
        riskLevel,
        reasons,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const levelOrder = { high: 0, medium: 1, low: 2 };
      const diff = (levelOrder[a.riskLevel] ?? 9) - (levelOrder[b.riskLevel] ?? 9);
      if (diff !== 0) return diff;
      const aEnds = a.membershipEndsAt ? new Date(a.membershipEndsAt).getTime() : Number.POSITIVE_INFINITY;
      const bEnds = b.membershipEndsAt ? new Date(b.membershipEndsAt).getTime() : Number.POSITIVE_INFINITY;
      return aEnds - bEnds;
    });

  const gymsRows = gyms
    .map((gym) => {
      const id = String(gym._id);
      const bookingRow = bookingMap.get(id) || {};
      const memberRow = membersMap.get(id) || {};
      const windowRow = windowMap.get(id) || {};

      return {
        _id: gym._id,
        name: gym.name,
        isActive: Boolean(gym.isActive),
        city: gym.location?.city || "",
        trainersCount: Array.isArray(gym.trainers) ? gym.trainers.length : 0,
        membersCount: Number(memberRow.membersCount || 0),
        activeMembersCount: Number(memberRow.activeMembersCount || 0),
        bookingsCount: Number(bookingRow.bookingsCount || 0),
        activeBookingsCount: Number(bookingRow.activeBookingsCount || 0),
        revenueTotal: Number(bookingRow.revenueTotal || 0),
        revenueActive: Number(bookingRow.revenueActive || 0),
        bookingsWindowCount: Number(windowRow.bookingsWindowCount || 0),
        revenueWindow: Number(windowRow.revenueWindow || 0),
        lastBookingAt: bookingRow.lastBookingAt || null,
        createdAt: gym.createdAt || null,
      };
    })
    .sort((a, b) => (b.revenueTotal || 0) - (a.revenueTotal || 0));

  const uniqueTrainerIds = Array.from(
    new Set(
      gyms
        .flatMap((gym) => gym.trainers || [])
        .map((id) => String(id))
        .filter(Boolean),
    ),
  );

  const trainerIdObjects = uniqueTrainerIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const trainerAssignmentCounts = new Map();
  gyms.forEach((gym) => {
    (gym.trainers || []).forEach((trainerId) => {
      const key = String(trainerId);
      trainerAssignmentCounts.set(key, (trainerAssignmentCounts.get(key) || 0) + 1);
    });
  });

  const [trainerUsers, trainerSessionsAgg] = await Promise.all([
    uniqueTrainerIds.length
      ? User.find({ _id: { $in: uniqueTrainerIds } }).select("_id fullName phone email").lean()
      : [],
    trainerIdObjects.length
      ? WorkoutSession.aggregate([
          { $match: { gym: { $in: gymIds }, assignedTrainer: { $in: trainerIdObjects } } },
          {
            $group: {
              _id: "$assignedTrainer",
              sessionsCount: { $sum: 1 },
              completedSessions: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
              activeSessions: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
              lastSessionAt: { $max: { $ifNull: ["$endedAt", "$startedAt"] } },
              gyms: { $addToSet: "$gym" },
              members: { $addToSet: "$member" },
            },
          },
          {
            $project: {
              sessionsCount: 1,
              completedSessions: 1,
              activeSessions: 1,
              lastSessionAt: 1,
              gymsCount: { $size: "$gyms" },
              membersCount: { $size: "$members" },
            },
          },
          { $sort: { completedSessions: -1, sessionsCount: -1 } },
        ])
      : [],
  ]);

  const trainerUserMap = new Map(trainerUsers.map((trainer) => [String(trainer._id), trainer]));
  const trainerSessionMap = new Map(trainerSessionsAgg.map((row) => [String(row._id), row]));

  const trainersRows = uniqueTrainerIds
    .map((trainerId) => {
      const u = trainerUserMap.get(String(trainerId)) || {};
      const s = trainerSessionMap.get(String(trainerId)) || {};

      return {
        _id: trainerId,
        fullName: u.fullName || "",
        phone: u.phone || "",
        email: u.email || "",
        gymsAssignedCount: Number(trainerAssignmentCounts.get(String(trainerId)) || 0),
        sessionsCount: Number(s.sessionsCount || 0),
        completedSessions: Number(s.completedSessions || 0),
        activeSessions: Number(s.activeSessions || 0),
        membersServedCount: Number(s.membersCount || 0),
        lastSessionAt: s.lastSessionAt || null,
      };
    })
    .sort((a, b) => (b.completedSessions || 0) - (a.completedSessions || 0));

  const summary = gymsRows.reduce(
    (acc, row) => {
      acc.gymsCount += 1;
      if (row.isActive) acc.activeGymsCount += 1;
      acc.bookingsCount += row.bookingsCount || 0;
      acc.activeBookingsCount += row.activeBookingsCount || 0;
      acc.revenueTotal += row.revenueTotal || 0;
      acc.revenueActive += row.revenueActive || 0;
      acc.bookingsWindowCount += row.bookingsWindowCount || 0;
      acc.revenueWindow += row.revenueWindow || 0;
      return acc;
    },
    {
      gymsCount: 0,
      activeGymsCount: 0,
      trainersCount: uniqueTrainerIds.length,
      membersCount: Number(overallMembers?.membersCount || 0),
      activeMembersCount: Number(overallMembers?.activeMembersCount || 0),
      bookingsCount: 0,
      activeBookingsCount: 0,
      revenueTotal: 0,
      revenueActive: 0,
      bookingsWindowCount: 0,
      revenueWindow: 0,
    },
  );

  return {
    windowDays: days,
    summary,
    accounts: {
      windowDays: days,
      window: getAccountTotals(transactionWindowAgg),
      prevWindow: getAccountTotals(transactionPrevAgg),
      series: transactionSeries,
    },
    membersRisk: {
      thresholds: {
        nearExpiryDays: memberRiskNearExpiryDays,
        lastVisitDays: memberRiskLastVisitDays,
        lowMinutes7d: memberRiskLowMinutes7d,
        irregularWindowDays: memberRiskIrregularWindowDays,
        irregularGapDays: memberRiskIrregularGapDays,
      },
      members: membersRiskRows,
    },
    gyms: gymsRows,
    trainers: trainersRows,
  };
};

export const setGymActiveStatusAdmin = async (gymId, isActive) => {
  const gym = await Gym.findByIdAndUpdate(
    gymId,
    { $set: { isActive } },
    { new: true },
  )
    .populate("owner", "fullName email phone")
    .populate("trainers", "fullName email phone role")
    .lean();

  if (!gym) {
    throw new AppError("Gym not found", StatusCodes.NOT_FOUND);
  }

  return gym;
};

export const deleteGymAdmin = async (gymId) => {
  const gym = await Gym.findById(gymId).select("_id trainers").lean();

  if (!gym) {
    throw new AppError("Gym not found", StatusCodes.NOT_FOUND);
  }

  await Promise.all([
    Plan.deleteMany({ gym: gymId }),
    Booking.deleteMany({ gym: gymId }),
    WorkoutSession.deleteMany({ gym: gymId }),
    TrainerRequest.deleteMany({ gym: gymId }),
    TrainerProfile.updateMany({ assignedGymIds: gymId }, { $pull: { assignedGymIds: gymId } }),
    Gym.deleteOne({ _id: gymId }),
  ]);

  return { gymId, deleted: true };
};

export const getOwnerGymManagement = async (actorId, actorRole, gymId) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter)
    .select("-assetKeySalt -assetKeyHash")
    .populate("trainers", "fullName phone role")
    .populate("equipmentIds", "name category type movementType loadType usageType difficulty isActive")
    .lean();

  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const [rawPlans, members, equipmentCatalog] = await Promise.all([
    Plan.find({ gym: gymId, isActive: true }).select("-coupons").sort({ durationDays: 1, price: 1 }).lean(),
    Booking.find({ gym: gymId })
      .populate("user", "fullName phone email")
      .populate("plan", "title durationLabel durationDays price")
      .sort({ createdAt: -1 })
      .lean(),
    Equipment.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  const plans = rawPlans;

  const trainerUserIds = Array.from(
    new Set(
      (gym.trainers || [])
        .map((trainer) => trainer?._id)
        .filter(Boolean)
        .map((id) => String(id)),
    ),
  );

  const trainerProfiles = trainerUserIds.length
    ? await TrainerProfile.find({ user: { $in: trainerUserIds } }).lean()
    : [];
  const trainerProfileMap = new Map(trainerProfiles.map((profile) => [String(profile.user), profile]));

  gym.trainers = (gym.trainers || []).map((trainer) => ({
    ...trainer,
    trainerProfile: trainer?._id ? trainerProfileMap.get(String(trainer._id)) || null : null,
  }));

  const memberUserIds = Array.from(
    new Set(
      members
        .map((booking) => booking.user?._id)
        .filter(Boolean)
        .map((id) => String(id)),
    ),
  );

  const profiles = memberUserIds.length
    ? await UserProfile.find({ user: { $in: memberUserIds } }).lean()
    : [];

  const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));

  const membersWithProfiles = members.map((booking) => ({
    ...booking,
    profile: booking.user?._id ? profileMap.get(String(booking.user._id)) || null : null,
  }));

  const memberDirectoryMap = new Map();
  membersWithProfiles.forEach((booking) => {
    const userId = booking.user?._id;
    if (!userId) return;
    const key = String(userId);
    if (memberDirectoryMap.has(key)) return;
    memberDirectoryMap.set(key, {
      user: booking.user,
      profile: booking.profile,
    });
  });

  const memberDirectory = Array.from(memberDirectoryMap.values());

  return { gym, plans, members: membersWithProfiles, memberDirectory, equipmentCatalog };
};

export const getGymManagementByAsset = async ({ gymId, assetId, assetKey }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  const result = await getOwnerGymManagement(String(gymSecrets._id), ROLES.ADMIN, gymId);
  const raw = gymSecrets.assetPermissions || {};
  const permissions = {
    overview: normalizePermissionLevel(raw.overview) || 1,
    plans: normalizePermissionLevel(raw.plans),
    trainers: normalizePermissionLevel(raw.trainers),
    members: normalizePermissionLevel(raw.members),
    accounts: normalizePermissionLevel(raw.accounts),
    equipment: normalizePermissionLevel(raw.equipment),
    specialists: normalizePermissionLevel(raw.specialists),
  };

  result.gym = { ...result.gym, assetPermissions: permissions };

  if (permissions.plans < 1) {
    result.plans = [];
  }
  if (permissions.trainers < 1) {
    result.gym.trainers = [];
  }
  if (permissions.members < 1) {
    result.members = [];
    result.memberDirectory = [];
  }
  if (permissions.equipment < 1) {
    result.gym.equipmentIds = [];
  }

  return result;
};

export const setGymAssetPermissions = async (actorId, actorRole, gymId, payload = {}) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id assetPermissions").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const currentRaw = gym.assetPermissions || {};
  const current = {
    overview: normalizePermissionLevel(currentRaw.overview) || 1,
    plans: normalizePermissionLevel(currentRaw.plans),
    trainers: normalizePermissionLevel(currentRaw.trainers),
    members: normalizePermissionLevel(currentRaw.members),
    accounts: normalizePermissionLevel(currentRaw.accounts),
    equipment: normalizePermissionLevel(currentRaw.equipment),
    specialists: normalizePermissionLevel(currentRaw.specialists),
  };

  const parseInput = (value, fallback) => {
    if (typeof value === "undefined") return fallback;
    return normalizePermissionLevel(value);
  };

  const next = {
    overview: 1,
    plans: parseInput(payload.plans, current.plans),
    trainers: parseInput(payload.trainers, current.trainers),
    members: parseInput(payload.members, current.members),
    accounts: parseInput(payload.accounts, current.accounts),
    equipment: parseInput(payload.equipment, current.equipment),
    specialists: parseInput(payload.specialists, current.specialists),
  };

  const updated = await Gym.findOneAndUpdate(gymFilter, { $set: { assetPermissions: next } }, { new: true })
    .select("-assetKeySalt -assetKeyHash")
    .populate("trainers", "fullName phone role")
    .populate("equipmentIds", "name category type movementType loadType usageType difficulty isActive")
    .lean();

  return updated;
};

export const getGymAssetPermissions = async (actorId, actorRole, gymId) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id assetPermissions").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  return gym.assetPermissions || {};
};

const parseOptionalDate = (value) => {
  if (!(value instanceof Date)) return null;
  if (Number.isNaN(value.getTime())) return null;
  return value;
};

export const listTransactionsByAsset = async ({ gymId, assetId, assetKey, accountType, category, from, to }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "accounts", "view");

  return transactionService.listTransactions({
    actorId: String(gymSecrets.owner),
    actorRole: ROLES.ADMIN,
    gymId,
    accountType: accountType || undefined,
    category: category || undefined,
    from: parseOptionalDate(from) || undefined,
    to: parseOptionalDate(to) || undefined,
  });
};

export const createTransactionByAsset = async ({ gymId, assetId, assetKey, ...payload }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "accounts", "edit");

  return transactionService.createTransaction({
    actorId: String(gymSecrets.owner),
    actorRole: ROLES.ADMIN,
    gymId,
    ...payload,
  });
};

export const updateTransactionByAsset = async ({ gymId, transactionId, assetId, assetKey, ...payload }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "accounts", "edit");

  return transactionService.updateTransaction({
    actorId: String(gymSecrets.owner),
    actorRole: ROLES.ADMIN,
    gymId,
    transactionId,
    ...payload,
  });
};

export const deleteTransactionByAsset = async ({ gymId, transactionId, assetId, assetKey }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "accounts", "edit");

  return transactionService.deleteTransaction({
    actorId: String(gymSecrets.owner),
    actorRole: ROLES.ADMIN,
    gymId,
    transactionId,
  });
};

export const createPlanByAsset = async ({ gymId, assetId, assetKey, ...payload }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "plans", "edit");

  await planService.createPlan({
    actorId: String(gymSecrets.owner),
    actorRole: ROLES.ADMIN,
    gymId,
    ...payload,
  });

  return getGymManagementByAsset({ gymId, assetId, assetKey });
};

export const updatePlanByAsset = async ({ gymId, planId, assetId, assetKey, ...payload }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "plans", "edit");

  await planService.updatePlan({
    actorId: String(gymSecrets.owner),
    actorRole: ROLES.ADMIN,
    planId,
    gymId,
    ...payload,
  });

  return getGymManagementByAsset({ gymId, assetId, assetKey });
};

export const removePlanByAsset = async ({ gymId, planId, assetId, assetKey }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "plans", "edit");

  await planService.removePlan({
    actorId: String(gymSecrets.owner),
    actorRole: ROLES.ADMIN,
    planId,
    gymId,
  });

  return getGymManagementByAsset({ gymId, assetId, assetKey });
};

export const setGymEquipmentByAsset = async ({ gymId, assetId, assetKey, equipmentIds = [] }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "equipment", "edit");

  await setGymEquipment(String(gymSecrets.owner), ROLES.ADMIN, gymId, equipmentIds);
  return getGymManagementByAsset({ gymId, assetId, assetKey });
};

export const lookupTrainerByAsset = async ({ gymId, assetId, assetKey, email }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "trainers", "edit");
  return lookupTrainerForGym(String(gymSecrets.owner), ROLES.ADMIN, { gymId, email });
};

export const sendTrainerEmailOtpByAsset = async ({ gymId, assetId, assetKey, email }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "trainers", "edit");
  return sendTrainerEmailOtp({ email });
};

export const verifyTrainerEmailOtpByAsset = async ({ gymId, assetId, assetKey, email, code }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "trainers", "edit");
  return verifyTrainerEmailOtp({ email, code });
};

export const addTrainerToGymByAsset = async ({ gymId, assetId, assetKey, email }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "trainers", "edit");
  await addTrainerToGym(String(gymSecrets.owner), ROLES.ADMIN, { gymId, email });
  return getGymManagementByAsset({ gymId, assetId, assetKey });
};

export const removeTrainerFromGymByAsset = async ({ gymId, assetId, assetKey, trainerId }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "trainers", "edit");
  await removeTrainerFromGym(String(gymSecrets.owner), ROLES.ADMIN, { gymId, trainerId });
  return getGymManagementByAsset({ gymId, assetId, assetKey });
};

export const lookupMemberByAsset = async ({ gymId, assetId, assetKey, phone, email }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "members", "edit");
  return lookupMember({ phone, email });
};

export const sendMemberEmailOtpByAsset = async ({ gymId, assetId, assetKey, email }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "members", "edit");
  return sendMemberEmailOtp({ email });
};

export const verifyMemberEmailOtpByAsset = async ({ gymId, assetId, assetKey, email, code }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "members", "edit");
  return verifyMemberEmailOtp({ email, code });
};

export const enrollMemberToGymPlanByAsset = async ({ gymId, assetId, assetKey, ...payload }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "members", "edit");

  await enrollMemberToGymPlan(String(gymSecrets.owner), ROLES.ADMIN, { ...payload, gymId });
  return getGymManagementByAsset({ gymId, assetId, assetKey });
};

export const validateCouponByAsset = async ({ gymId, assetId, assetKey, planId, couponCode }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "members", "view");

  return planService.validateCouponCode({ gymId, planId, couponCode });
};

export const listCouponsByAsset = async ({ gymId, assetId, assetKey, planId, includeInactive = false }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "plans", "view");

  const coupons = await Coupon.find({
    gym: gymId,
    ...(planId ? { plan: planId } : {}),
    ...(includeInactive ? {} : { isActive: true }),
  })
    .sort({ createdAt: -1 })
    .lean();

  return coupons;
};

export const disableCouponByAsset = async ({ gymId, assetId, assetKey, couponId }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "plans", "edit");

  const id = String(couponId || "").trim();
  if (!id) {
    throw new AppError("Coupon ID is required", StatusCodes.BAD_REQUEST);
  }

  const result = await Coupon.updateOne({ _id: id, gym: gymId }, { $set: { isActive: false } });
  if (result.matchedCount === 0) {
    throw new AppError("Coupon not found", StatusCodes.NOT_FOUND);
  }

  return { couponId: id, disabled: true };
};

export const setGymEquipment = async (actorId, actorRole, gymId, equipmentIds = []) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };

  const gym = await Gym.findOne(gymFilter).select("_id").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const uniqueIds = Array.from(new Set(equipmentIds.filter(Boolean)));

  if (uniqueIds.length) {
    const found = await Equipment.find({ _id: { $in: uniqueIds }, isActive: true }).select("_id").lean();
    if (found.length !== uniqueIds.length) {
      throw new AppError("One or more equipment items were not found", StatusCodes.NOT_FOUND);
    }
  }

  await Gym.updateOne({ _id: gymId }, { $set: { equipmentIds: uniqueIds } });

  return Gym.findById(gymId)
    .select("-assetKeySalt -assetKeyHash")
    .populate("trainers", "fullName phone role")
    .populate("equipmentIds", "name category type movementType loadType usageType difficulty isActive")
    .lean();
};

export const setGymAssetCredentials = async (actorId, actorRole, gymId, { assetId, assetKey }) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const normalizedAssetId = String(assetId || "").trim();
  const normalizedAssetKey = String(assetKey || "").trim();

  if (!normalizedAssetId || !normalizedAssetKey) {
    throw new AppError("Asset ID and Asset Key are required", StatusCodes.BAD_REQUEST);
  }

  const assetKeySalt = crypto.randomBytes(16).toString("hex");
  const assetKeyHash = hashAssetKey(normalizedAssetKey, assetKeySalt);

  const updated = await Gym.findOneAndUpdate(
    gymFilter,
    { $set: { assetId: normalizedAssetId, assetKeySalt, assetKeyHash } },
    { new: true },
  )
    .select("-assetKeySalt -assetKeyHash")
    .lean();

  if (!updated) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  return updated;
};

export const getPublicGyms = async () =>
  Gym.find({ isActive: true })
    .select("-assetKeySalt -assetKeyHash")
    .select("name slug location amenities trainers createdAt")
    .sort({ createdAt: -1 })
    .lean();

export const lookupTrainerForGym = async (actorId, actorRole, { gymId, email }) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const normalizedEmail = normalizeEmail(email);
  const [gym, trainer] = await Promise.all([
    Gym.findOne(gymFilter).lean(),
    User.findOne({ email: normalizedEmail, role: ROLES.TRAINER }).select("_id fullName email phone role").lean(),
  ]);

  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  if (!trainer) {
    throw new AppError("Trainer account not found for this email", StatusCodes.NOT_FOUND);
  }

  return trainer;
};

export const sendTrainerEmailOtp = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  const trainer = await User.findOne({ email: normalizedEmail, role: ROLES.TRAINER }).lean();

  if (!trainer) {
    throw new AppError("Trainer account not found for this email", StatusCodes.NOT_FOUND);
  }

  await Otp.deleteMany({ email: normalizedEmail, purpose: "trainer-gym-link" });
  const otpCode = env.demoOtpMode ? env.demoOtp : generateOtpCode();

  await Otp.create({
    email: normalizedEmail,
    purpose: "trainer-gym-link",
    code: otpCode,
    expiresAt: buildExpiresAt(10),
  });

  if (env.demoOtpMode) {
    return {
      email: normalizedEmail,
      code: otpCode,
      deliveryMode: "demo",
      message: "Trainer email OTP generated in demo mode",
    };
  }

  if (!isEmailDeliveryConfigured()) {
    throw new AppError("Email OTP delivery is not configured", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  try {
    await sendOtpEmail({ to: normalizedEmail, code: otpCode });
  } catch {
    throw new AppError("Unable to send OTP email right now", StatusCodes.BAD_GATEWAY);
  }

  return {
    email: normalizedEmail,
    deliveryMode: "smtp",
    message: "Trainer email OTP sent successfully",
  };
};

export const verifyTrainerEmailOtp = async ({ email, code }) => {
  const normalizedEmail = normalizeEmail(email);
  const otp = await Otp.findOne({ email: normalizedEmail, purpose: "trainer-gym-link" }).sort({ createdAt: -1 });

  if (!otp || otp.code !== code || otp.expiresAt < new Date()) {
    throw new AppError("Invalid or expired trainer email OTP", StatusCodes.UNAUTHORIZED);
  }

  otp.verifiedAt = new Date();
  await otp.save();

  return { email: normalizedEmail, verified: true };
};

export const addTrainerToGym = async (actorId, actorRole, { gymId, email }) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const normalizedEmail = normalizeEmail(email);
  const verifiedTrainerOtp = await Otp.findOne({
    email: normalizedEmail,
    purpose: "trainer-gym-link",
    verifiedAt: { $ne: null },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!verifiedTrainerOtp || verifiedTrainerOtp.expiresAt < new Date()) {
    throw new AppError("Please verify trainer email OTP before adding this trainer", StatusCodes.BAD_REQUEST);
  }

  const [gym, trainer] = await Promise.all([
    Gym.findOne(gymFilter),
    User.findOne({ email: normalizedEmail, role: ROLES.TRAINER }),
  ]);

  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  if (!trainer) {
    throw new AppError("Trainer not found", StatusCodes.NOT_FOUND);
  }

  await Gym.updateOne({ _id: gymId }, { $addToSet: { trainers: trainer._id } });
  await TrainerProfile.findOneAndUpdate(
    { user: trainer._id },
    { $addToSet: { assignedGymIds: gymId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return Gym.findById(gymId).populate("trainers", "fullName phone role").lean();
};

export const removeTrainerFromGym = async (actorId, actorRole, { gymId, trainerId }) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const [gym, trainer] = await Promise.all([
    Gym.findOne(gymFilter),
    User.findOne({ _id: trainerId, role: ROLES.TRAINER }),
  ]);

  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  if (!trainer) {
    throw new AppError("Trainer not found", StatusCodes.NOT_FOUND);
  }

  await Gym.updateOne({ _id: gymId }, { $pull: { trainers: trainerId } });
  await TrainerProfile.findOneAndUpdate(
    { user: trainerId },
    { $pull: { assignedGymIds: gymId } },
    { new: true },
  );

  return Gym.findById(gymId).populate("trainers", "fullName phone role").lean();
};

export const getGymQr = async (gymId) => {
  const gym = await Gym.findById(gymId).select("name qrToken").lean();

  if (!gym) {
    throw new AppError("Gym not found", StatusCodes.NOT_FOUND);
  }

  const qrPayload = JSON.stringify({ gymId, qrToken: gym.qrToken });
  const qrCode = await QRCode.toDataURL(qrPayload);

  return { ...gym, qrCode };
};

export const lookupMember = async ({ phone, email }) => {
  const filters = [];
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);

  if (normalizedPhone) {
    filters.push({ phone: normalizedPhone });
  }

  if (normalizedEmail) {
    filters.push({ email: normalizedEmail });
  }

  const user = await User.findOne({ role: ROLES.MEMBER, $or: filters }).lean();

  if (!user) {
    return { exists: false };
  }

  const profile = await UserProfile.findOne({ user: user._id }).lean();

  return {
    exists: true,
    user: {
      _id: user._id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
    },
    profile,
  };
};

export const sendMemberEmailOtp = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  const otpCode = env.demoOtpMode ? env.demoOtp : generateOtpCode();
  await Otp.deleteMany({ email: normalizedEmail, purpose: "member-enroll-email" });

  await Otp.create({
    email: normalizedEmail,
    purpose: "member-enroll-email",
    code: otpCode,
    expiresAt: buildExpiresAt(10),
  });

  if (env.demoOtpMode) {
    return {
      email: normalizedEmail,
      code: otpCode,
      deliveryMode: "demo",
      message: "Email OTP generated in demo mode",
    };
  }

  if (!isEmailDeliveryConfigured()) {
    throw new AppError("Email OTP delivery is not configured", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  try {
    await sendOtpEmail({
      to: normalizedEmail,
      code: otpCode,
    });
  } catch {
    throw new AppError("Unable to send OTP email right now", StatusCodes.BAD_GATEWAY);
  }

  return {
    email: normalizedEmail,
    deliveryMode: "smtp",
    message: "Email OTP sent successfully",
  };
};

export const verifyMemberEmailOtp = async ({ email, code }) => {
  const normalizedEmail = normalizeEmail(email);
  const otp = await Otp.findOne({ email: normalizedEmail, purpose: "member-enroll-email" }).sort({ createdAt: -1 });

  if (!otp || otp.code !== code || otp.expiresAt < new Date()) {
    throw new AppError("Invalid or expired email OTP", StatusCodes.UNAUTHORIZED);
  }

  otp.verifiedAt = new Date();
  await otp.save();

  return { email: normalizedEmail, verified: true };
};

export const enrollMemberToGymPlan = async (actorId, actorRole, payload) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: payload.gymId } : { _id: payload.gymId, owner: actorId };
  const [gym, plan, bookedBy] = await Promise.all([
    Gym.findOne(gymFilter).select("_id name location").lean(),
    Plan.findOne({ _id: payload.planId, gym: payload.gymId, isActive: true }).lean(),
    User.findById(actorId).select("_id fullName phone email role").lean(),
  ]);

  if (!gym || !plan) {
    throw new AppError("Gym or plan not found", StatusCodes.NOT_FOUND);
  }

  const normalizedPhone = normalizePhone(payload.phone);
  const normalizedEmail = normalizeEmail(payload.email);
  const lookup = await lookupMember({ phone: normalizedPhone, email: normalizedEmail });
  let memberId = lookup.user?._id;

  if (!lookup.exists) {
    if (normalizedEmail) {
      const verifiedEmailOtp = await Otp.findOne({
        email: normalizedEmail,
        purpose: "member-enroll-email",
        verifiedAt: { $ne: null },
      })
        .sort({ createdAt: -1 })
        .lean();

      if (!verifiedEmailOtp || verifiedEmailOtp.expiresAt < new Date()) {
        throw new AppError("Please verify email OTP before adding this member", StatusCodes.BAD_REQUEST);
      }
    }

    if (!payload.fullName || !normalizedPhone || !payload.age || !payload.gender || !payload.fitnessGoal || !payload.occupationType || !payload.heightCm || !payload.weightKg || !payload.bodyType || !payload.fatDistributionType) {
      throw new AppError("Please complete the new member details before continuing", StatusCodes.BAD_REQUEST);
    }

    const createdUser = await User.create({
      phone: normalizedPhone,
      email: normalizedEmail || undefined,
      fullName: payload.fullName,
      role: ROLES.MEMBER,
    });

    await UserProfile.create({
      user: createdUser._id,
      age: payload.age,
      gender: payload.gender,
      fitnessGoal: payload.fitnessGoal,
      occupationType: payload.occupationType,
      heightCm: payload.heightCm,
      weightKg: payload.weightKg,
      bodyType: payload.bodyType,
      fatDistributionType: payload.fatDistributionType,
      medicalNotes: payload.medicalNotes,
    });

    memberId = createdUser._id;
  }

  const parseStartDate = () => {
    const startsAt = new Date(payload.startDate);
    startsAt.setHours(0, 0, 0, 0);
    return startsAt;
  };

  const resolveSlot = () => {
    if (!Array.isArray(plan.timeSlots) || !plan.timeSlots.length) {
      return { slot: null, startsAt: parseStartDate() };
    }

    const normalizedSlotId = String(payload.timeSlotId || "").trim();
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

  const { slot, startsAt } = resolveSlot();

  if (Number.isNaN(startsAt.getTime())) {
    throw new AppError("Invalid start date", StatusCodes.BAD_REQUEST);
  }

  const endsAt = new Date(startsAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  if (slot?.capacity) {
    const capacity = Number(slot.capacity);
    if (Number.isFinite(capacity) && capacity > 0) {
      const reservedCount = await Booking.countDocuments({
        gym: payload.gymId,
        plan: payload.planId,
        startsAt,
        status: { $ne: "cancelled" },
      });
      if (reservedCount >= capacity) {
        throw new AppError("This time slot is fully booked", StatusCodes.CONFLICT);
      }
    }
  }

  const pricing = await planService.computeCouponPricing({
    gymId: payload.gymId,
    planId: payload.planId,
    plan,
    couponCode: payload.couponCode,
  });

  let reservedCouponId = null;
  if (pricing.coupon) {
    const filter = { _id: pricing.coupon._id, isActive: true };
    if (pricing.coupon.expiresAt) {
      filter.expiresAt = { $gte: new Date() };
    }
    if (typeof pricing.coupon.maxUses === "number") {
      filter.usedCount = { $lt: pricing.coupon.maxUses };
    }

    const result = await Coupon.updateOne(filter, { $inc: { usedCount: 1 } });
    if (result.modifiedCount > 0) {
      reservedCouponId = pricing.coupon._id;
    }
  }

  const finalPricing = reservedCouponId
    ? pricing
    : { ...pricing, couponId: null, couponCode: "", discountAmount: 0, finalPrice: pricing.listPrice };

  let booking;
  try {
    booking = await Booking.create({
      user: memberId,
      gym: payload.gymId,
      plan: payload.planId,
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
  } catch (error) {
    if (reservedCouponId) {
      await Coupon.updateOne({ _id: reservedCouponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
    }
    throw error;
  }

  const populatedBooking = await Booking.findById(booking._id)
    .populate("user", "fullName phone email")
    .populate("plan", "title durationLabel durationDays price")
    .lean();

  const memberEmail = populatedBooking?.user?.email ? String(populatedBooking.user.email).trim() : "";

  if (memberEmail) {
    try {
      await sendBookingInvoiceEmail({
        to: memberEmail,
        bookingId: populatedBooking?._id,
        invoiceDate: new Date(),
        member: populatedBooking?.user,
        bookedBy,
        gym,
        plan: populatedBooking?.plan,
        booking: populatedBooking,
        currency: "INR",
      });
    } catch (emailError) {
      // Booking should succeed even if email fails (SMTP not configured, transient errors, etc.).
      // eslint-disable-next-line no-console
      console.error("Failed to send booking invoice email:", emailError);
    }
  }

  return populatedBooking;
};
