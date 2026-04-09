import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";
import { Booking } from "../models/Booking.js";
import { Gym } from "../models/Gym.js";
import { MemberCheckInQuestion } from "../models/MemberCheckInQuestion.js";
import { MemberCheckInSetting } from "../models/MemberCheckInSetting.js";
import { MemberDailyCheckIn } from "../models/MemberDailyCheckIn.js";
import { User } from "../models/User.js";
import { ROLES } from "../constants/roles.js";
import { assertAssetPermission, verifyGymAssetAccess } from "./gym.service.js";

const getTodayKey = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const diffDays = (fromDate, toDate) => {
  const from = fromDate instanceof Date ? fromDate : new Date(fromDate);
  const to = toDate instanceof Date ? toDate : new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  const fromKey = new Date(from);
  fromKey.setHours(0, 0, 0, 0);
  const toKey = new Date(to);
  toKey.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((toKey.getTime() - fromKey.getTime()) / (1000 * 60 * 60 * 24)));
};

const clampDays = (daysParam, fallback = 30) =>
  Number.isFinite(Number(daysParam)) ? Math.min(Math.max(Number(daysParam), 1), 90) : fallback;

const getSinceKey = (days) => {
  const today = getTodayKey();
  return new Date(today.getTime() - (Math.max(days, 1) - 1) * 24 * 60 * 60 * 1000);
};

const formatCheckIn = (doc) => ({
  checkInId: String(doc._id),
  gymId: String(doc.gym),
  memberId: String(doc.member),
  dateKey: doc.dateKey,
  sleepHours: typeof doc.sleepHours === "number" ? doc.sleepHours : null,
  sleepQuality: typeof doc.sleepQuality === "number" ? doc.sleepQuality : null,
  waterLiters: typeof doc.waterLiters === "number" ? doc.waterLiters : null,
  energy: typeof doc.energy === "number" ? doc.energy : null,
  painScore: typeof doc.painScore === "number" ? doc.painScore : null,
  painArea: doc.painArea || "",
  workoutTime: doc.workoutTime || "none",
  notes: doc.notes || "",
  customAnswers: doc.customAnswers || {},
  hasUnexpected: Boolean(doc.hasUnexpected),
  createdAt: doc.createdAt,
});

export const listGymMemberCheckInSettings = async (actorId, actorRole, gymId) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const settings = await MemberCheckInSetting.find({ gym: gymId }).select("member enabled").lean();
  return settings.map((row) => ({ memberId: String(row.member), enabled: Boolean(row.enabled) }));
};

export const setGymMemberCheckInSetting = async (actorId, actorRole, gymId, memberId, enabled) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const hasBooking = await Booking.exists({ gym: gymId, user: memberId });
  if (!hasBooking) {
    throw new AppError("Member is not associated with this gym", StatusCodes.BAD_REQUEST);
  }

  const update = {
    enabled: Boolean(enabled),
    enabledBy: actorId,
    enabledAt: enabled ? new Date() : null,
  };

  const setting = await MemberCheckInSetting.findOneAndUpdate(
    { gym: gymId, member: memberId },
    { $set: update },
    { upsert: true, new: true, runValidators: true },
  )
    .select("gym member enabled enabledAt")
    .lean();

  return {
    gymId: String(setting.gym),
    memberId: String(setting.member),
    enabled: Boolean(setting.enabled),
    enabledAt: setting.enabledAt || null,
  };
};

export const listGymMemberCheckInSettingsByAsset = async ({ gymId, assetId, assetKey }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "members");
  return listGymMemberCheckInSettings(String(gymSecrets.owner), ROLES.ADMIN, gymId);
};

export const setGymMemberCheckInSettingByAsset = async ({ gymId, assetId, assetKey, memberId, enabled }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "members");
  return setGymMemberCheckInSetting(String(gymSecrets.owner), ROLES.ADMIN, gymId, memberId, enabled);
};

export const getMemberCheckInPrompt = async (memberId) => {
  const todayKey = getTodayKey();

  const activeBookings = await Booking.find({
    user: memberId,
    status: "active",
    endsAt: { $gte: new Date() },
  })
    .select("_id gym plan startsAt endsAt")
    .populate("gym", "name location.city")
    .populate("plan", "title durationLabel durationDays")
    .sort({ createdAt: -1 })
    .lean();

  if (!activeBookings.length) {
    return { required: false, reason: "no_active_booking", dateKey: todayKey };
  }

  const gymIds = Array.from(new Set(activeBookings.map((b) => String(b.gym?._id || b.gym)).filter(Boolean)));
  const enabledSettings = await MemberCheckInSetting.find({
    member: memberId,
    gym: { $in: gymIds },
    enabled: true,
  })
    .select("gym")
    .lean();

  if (!enabledSettings.length) {
    return { required: false, reason: "not_enabled", dateKey: todayKey };
  }

  const enabledGymIds = new Set(enabledSettings.map((row) => String(row.gym)));

  const existingToday = await MemberDailyCheckIn.find({
    member: memberId,
    gym: { $in: Array.from(enabledGymIds) },
    dateKey: todayKey,
  })
    .select("gym createdAt")
    .lean();

  const submittedGymIds = new Set(existingToday.map((row) => String(row.gym)));

  const bookingNeedingCheckIn = activeBookings.find((b) => {
    const gymId = String(b.gym?._id || b.gym);
    return enabledGymIds.has(gymId) && !submittedGymIds.has(gymId);
  });

  if (!bookingNeedingCheckIn) {
    return { required: false, reason: "already_submitted_today", dateKey: todayKey };
  }

  const gym = bookingNeedingCheckIn.gym;
  const plan = bookingNeedingCheckIn.plan;
  const gymId = gym?._id ? String(gym._id) : String(bookingNeedingCheckIn.gym);

  const customQuestionsRaw = gymId
    ? await MemberCheckInQuestion.find({ gym: gymId, isActive: true })
        .select("_id label type options required order frequencyDays")
        .sort({ order: 1, createdAt: 1 })
        .lean()
    : [];

  const recentCheckIns = gymId
    ? await MemberDailyCheckIn.find({ gym: gymId, member: memberId })
        .select("dateKey customAnswers")
        .sort({ dateKey: -1 })
        .limit(120)
        .lean()
    : [];

  const lastAnsweredDateByQuestion = new Map();
  recentCheckIns.forEach((doc) => {
    const answers = doc.customAnswers && typeof doc.customAnswers === "object" ? doc.customAnswers : {};
    Object.keys(answers).forEach((key) => {
      if (lastAnsweredDateByQuestion.has(key)) return;
      lastAnsweredDateByQuestion.set(key, doc.dateKey);
    });
  });

  const customQuestions = customQuestionsRaw.filter((q) => {
    const freq = Number(q.frequencyDays) || 1;
    if (freq <= 1) return true;
    const last = lastAnsweredDateByQuestion.get(String(q._id));
    if (!last) return true;
    return diffDays(last, todayKey) >= freq;
  });

  return {
    required: true,
    dateKey: todayKey,
    gym: gym?._id ? { _id: gym._id, name: gym.name, city: gym.location?.city || "" } : null,
    plan: plan?._id ? { _id: plan._id, title: plan.title, durationLabel: plan.durationLabel, durationDays: plan.durationDays } : null,
    customQuestions,
  };
};

export const submitMemberDailyCheckIn = async (memberId, payload) => {
  const todayKey = getTodayKey();

  const enabled = await MemberCheckInSetting.findOne({
    gym: payload.gymId,
    member: memberId,
    enabled: true,
  })
    .select("_id")
    .lean();

  if (!enabled) {
    throw new AppError("Daily check-in is not enabled for this member", StatusCodes.FORBIDDEN);
  }

  const hasActiveBooking = await Booking.exists({
    gym: payload.gymId,
    user: memberId,
    status: "active",
    endsAt: { $gte: new Date() },
  });

  if (!hasActiveBooking) {
    throw new AppError("Active booking not found for this gym", StatusCodes.BAD_REQUEST);
  }

  const questions = await MemberCheckInQuestion.find({ gym: payload.gymId, isActive: true })
    .select("_id label expected alertOnUnexpected required type")
    .lean();

  const customAnswers = payload.customAnswers && typeof payload.customAnswers === "object" ? payload.customAnswers : {};

  const unexpectedCustomAnswers = [];

  const normalizeAnswer = (answer) => (typeof answer === "string" ? answer.trim() : answer);

  questions.forEach((q) => {
    if (!q.alertOnUnexpected || !q.expected) return;

    const qid = String(q._id);
    const answer = Object.prototype.hasOwnProperty.call(customAnswers, qid) ? normalizeAnswer(customAnswers[qid]) : undefined;
    const expected = q.expected || {};
    const mode = expected?.mode;

    const isMissing = typeof answer === "undefined" || answer === null || answer === "";
    if (isMissing) {
      if (q.required) {
        unexpectedCustomAnswers.push({ questionId: q._id, label: q.label, answer: null, expected });
      }
      return;
    }

    let isUnexpected = false;

    if (mode === "equals") {
      isUnexpected = String(answer) !== String(expected.value);
    } else if (mode === "contains") {
      isUnexpected = !String(answer).toLowerCase().includes(String(expected.value || "").toLowerCase());
    } else if (mode === "range") {
      const num = Number(answer);
      const min = typeof expected.min === "number" ? expected.min : null;
      const max = typeof expected.max === "number" ? expected.max : null;
      if (!Number.isFinite(num)) {
        isUnexpected = true;
      } else if (min !== null && num < min) {
        isUnexpected = true;
      } else if (max !== null && num > max) {
        isUnexpected = true;
      }
    }

    if (isUnexpected) {
      unexpectedCustomAnswers.push({ questionId: q._id, label: q.label, answer, expected });
    }
  });

  const update = {
    sleepHours: payload.sleepHours,
    sleepQuality: payload.sleepQuality,
    waterLiters: payload.waterLiters,
    energy: payload.energy,
    painScore: payload.painScore,
    painArea: payload.painArea || undefined,
    workoutTime: payload.workoutTime || "none",
    notes: payload.notes || undefined,
    customAnswers,
    hasUnexpected: unexpectedCustomAnswers.length > 0,
    unexpectedCustomAnswers,
  };

  const doc = await MemberDailyCheckIn.findOneAndUpdate(
    { gym: payload.gymId, member: memberId, dateKey: todayKey },
    { $set: update, $setOnInsert: { gym: payload.gymId, member: memberId, dateKey: todayKey } },
    { upsert: true, new: true, runValidators: true },
  )
    .select("_id gym member dateKey createdAt")
    .lean();

  return {
    checkInId: String(doc._id),
    gymId: String(doc.gym),
    memberId: String(doc.member),
    dateKey: doc.dateKey,
    createdAt: doc.createdAt,
  };
};

export const listMemberDailyCheckIns = async (memberId, gymId, daysParam) => {
  const days = clampDays(daysParam, 30);
  const sinceKey = getSinceKey(days);

  const hasBooking = await Booking.exists({ gym: gymId, user: memberId });
  if (!hasBooking) {
    throw new AppError("Member is not associated with this gym", StatusCodes.BAD_REQUEST);
  }

  const [gym, questions, docs] = await Promise.all([
    Gym.findById(gymId).select("_id name location.city").lean(),
    MemberCheckInQuestion.find({ gym: gymId })
      .select("_id label type options required frequencyDays order isActive createdAt")
      .sort({ order: 1, createdAt: 1 })
      .lean(),
    MemberDailyCheckIn.find({ gym: gymId, member: memberId, dateKey: { $gte: sinceKey } })
      .sort({ dateKey: -1 })
      .limit(200)
      .lean(),
  ]);

  if (!gym) {
    throw new AppError("Gym not found", StatusCodes.NOT_FOUND);
  }

  return {
    days,
    gym: { _id: gym._id, name: gym.name, city: gym.location?.city || "" },
    questions,
    items: docs.map(formatCheckIn),
  };
};

export const listGymDailyCheckIns = async (actorId, actorRole, gymId, memberId, daysParam) => {
  const days = clampDays(daysParam, 30);
  const sinceKey = getSinceKey(days);

  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id name location.city").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const memberFilter = memberId ? { member: memberId } : {};

  if (memberId) {
    const hasBooking = await Booking.exists({ gym: gymId, user: memberId });
    if (!hasBooking) {
      throw new AppError("Member is not associated with this gym", StatusCodes.BAD_REQUEST);
    }
  }

  const [questions, docs, memberUser] = await Promise.all([
    MemberCheckInQuestion.find({ gym: gymId })
      .select("_id label type options required frequencyDays order isActive createdAt")
      .sort({ order: 1, createdAt: 1 })
      .lean(),
    MemberDailyCheckIn.find({ gym: gymId, ...memberFilter, dateKey: { $gte: sinceKey } })
      .sort({ dateKey: -1 })
      .limit(400)
      .lean(),
    memberId ? User.findById(memberId).select("_id fullName phone email").lean() : null,
  ]);

  return {
    days,
    gym: { _id: gym._id, name: gym.name, city: gym.location?.city || "" },
    member: memberUser ? { _id: memberUser._id, fullName: memberUser.fullName, phone: memberUser.phone, email: memberUser.email } : null,
    questions,
    items: docs.map(formatCheckIn),
  };
};

export const listGymDailyCheckInsByAsset = async ({ gymId, assetId, assetKey, memberId, days }) => {
  const gymSecrets = await verifyGymAssetAccess({ gymId, assetId, assetKey });
  assertAssetPermission(gymSecrets, "members");
  return listGymDailyCheckIns(String(gymSecrets.owner), ROLES.ADMIN, gymId, memberId, days);
};

export const listGymQuestions = async (actorId, actorRole, gymId) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const questions = await MemberCheckInQuestion.find({ gym: gymId })
    .select("_id label type options required frequencyDays expected alertOnUnexpected order isActive createdAt")
    .sort({ order: 1, createdAt: 1 })
    .lean();

  return questions;
};

export const createGymQuestion = async (actorId, actorRole, payload) => {
  const gymFilter = actorRole === ROLES.ADMIN ? { _id: payload.gymId } : { _id: payload.gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const options = Array.isArray(payload.options) ? payload.options.map((o) => String(o).trim()).filter(Boolean) : [];
  if (payload.type === "select" && !options.length) {
    throw new AppError("Select questions need at least one option", StatusCodes.BAD_REQUEST);
  }

  const question = await MemberCheckInQuestion.create({
    gym: payload.gymId,
    label: payload.label,
    type: payload.type,
    options,
    required: Boolean(payload.required),
    frequencyDays: Number.isFinite(Number(payload.frequencyDays)) ? Number(payload.frequencyDays) : 1,
    expected: payload.expected,
    alertOnUnexpected: Boolean(payload.alertOnUnexpected),
    order: Number.isFinite(Number(payload.order)) ? Number(payload.order) : 0,
  });

  return MemberCheckInQuestion.findById(question._id)
    .select("_id label type options required frequencyDays expected alertOnUnexpected order isActive createdAt")
    .lean();
};

export const updateGymQuestion = async (actorId, actorRole, questionId, payload) => {
  const question = await MemberCheckInQuestion.findById(questionId).lean();
  if (!question) {
    throw new AppError("Question not found", StatusCodes.NOT_FOUND);
  }

  const gymFilter = actorRole === ROLES.ADMIN ? { _id: question.gym } : { _id: question.gym, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const update = {};
  if (typeof payload.label !== "undefined") update.label = payload.label;
  if (typeof payload.type !== "undefined") update.type = payload.type;
  if (typeof payload.required !== "undefined") update.required = Boolean(payload.required);
  if (typeof payload.frequencyDays !== "undefined") update.frequencyDays = Number(payload.frequencyDays) || 1;
  if (typeof payload.expected !== "undefined") update.expected = payload.expected;
  if (typeof payload.alertOnUnexpected !== "undefined") update.alertOnUnexpected = Boolean(payload.alertOnUnexpected);
  if (typeof payload.order !== "undefined") update.order = Number(payload.order) || 0;
  if (typeof payload.isActive !== "undefined") update.isActive = Boolean(payload.isActive);
  if (typeof payload.options !== "undefined") {
    const options = Array.isArray(payload.options) ? payload.options.map((o) => String(o).trim()).filter(Boolean) : [];
    update.options = options;
  }

  const updated = await MemberCheckInQuestion.findOneAndUpdate(
    { _id: questionId },
    { $set: update },
    { new: true, runValidators: true },
  )
    .select("_id label type options required frequencyDays expected alertOnUnexpected order isActive createdAt")
    .lean();

  return updated;
};

export const deleteGymQuestion = async (actorId, actorRole, questionId) => {
  const question = await MemberCheckInQuestion.findById(questionId).lean();
  if (!question) {
    throw new AppError("Question not found", StatusCodes.NOT_FOUND);
  }

  const gymFilter = actorRole === ROLES.ADMIN ? { _id: question.gym } : { _id: question.gym, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  await MemberCheckInQuestion.updateOne({ _id: questionId }, { $set: { isActive: false } });
  return { questionId, deleted: true };
};

export const listGymUnexpectedCheckIns = async (actorId, actorRole, gymId, daysParam) => {
  const days = clampDays(daysParam, 7);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const gymFilter = actorRole === ROLES.ADMIN ? { _id: gymId } : { _id: gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }

  const docs = await MemberDailyCheckIn.find({
    gym: gymId,
    hasUnexpected: true,
    createdAt: { $gte: since },
  })
    .select("_id member dateKey unexpectedCustomAnswers createdAt")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const memberIds = Array.from(new Set(docs.map((d) => String(d.member)).filter(Boolean)));
  const users = memberIds.length
    ? await User.find({ _id: { $in: memberIds } }).select("_id fullName phone email").lean()
    : [];

  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return {
    days,
    items: docs.map((d) => ({
      checkInId: String(d._id),
      member: userMap.get(String(d.member)) || { _id: d.member },
      dateKey: d.dateKey,
      createdAt: d.createdAt,
      unexpected: d.unexpectedCustomAnswers || [],
    })),
  };
};
