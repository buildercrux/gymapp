import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";
import { Booking } from "../models/Booking.js";
import { Exercise } from "../models/Exercise.js";
import { Gym } from "../models/Gym.js";
import { MemberProgram } from "../models/MemberProgram.js";
import { Notification } from "../models/Notification.js";
import { TrainerRequest } from "../models/TrainerRequest.js";
import { WorkoutSession } from "../models/WorkoutSession.js";
import { WorkoutType } from "../models/WorkoutType.js";
import { emitToUser } from "../realtime/socket.js";

const normalizeText = (value) => String(value || "").trim();
const normalizeUpper = (value) => normalizeText(value).toUpperCase();

const computeNextDay = (lastCompleted, maxDay) => {
  const last = Number(lastCompleted || 0);
  if (!Number.isFinite(last) || last < 0) {
    return 1;
  }
  return maxDay ? ((last % maxDay) + 1) : 1;
};

const pickExercisesForTargets = async ({ gymId, targets = [], count = 6 }) => {
  const gym = await Gym.findById(gymId).select("equipmentIds").lean();
  const allowedEquipmentIds = gym?.equipmentIds || [];

  const normalizedTargets = targets.map(normalizeUpper).filter(Boolean);
  const uniqueTargets = Array.from(new Set(normalizedTargets));
  if (!uniqueTargets.length) {
    return [];
  }

  const perTarget = Math.floor(count / uniqueTargets.length);
  const remainder = count % uniqueTargets.length;

  const used = new Set();
  const planned = [];

  for (let index = 0; index < uniqueTargets.length; index += 1) {
    const bodyPart = uniqueTargets[index];
    const take = perTarget + (index < remainder ? 1 : 0);
    if (take <= 0) continue;

    const filter = {
      isActive: true,
      bodyPart,
      $or: [
        { equipmentId: null },
        ...(allowedEquipmentIds.length ? [{ equipmentId: { $in: allowedEquipmentIds } }] : []),
      ],
    };

    // Overfetch a little to avoid duplicates when multiple targets overlap (or repeated seeds).
    const candidates = await Exercise.find(filter).select("_id name bodyPart").sort({ name: 1 }).limit(30).lean();

    for (const candidate of candidates) {
      if (planned.length >= count) break;
      if (planned.filter((item) => item.bodyPart === bodyPart).length >= take) break;
      const id = candidate._id.toString();
      if (used.has(id)) continue;
      used.add(id);
      planned.push({ exercise: candidate._id, bodyPart: candidate.bodyPart || bodyPart });
    }
  }

  // Fill remaining slots from any of the targets.
  if (planned.length < count) {
    const fillCandidates = await Exercise.find({
      isActive: true,
      bodyPart: { $in: uniqueTargets },
      $or: [
        { equipmentId: null },
        ...(allowedEquipmentIds.length ? [{ equipmentId: { $in: allowedEquipmentIds } }] : []),
      ],
    })
      .select("_id name bodyPart")
      .sort({ name: 1 })
      .limit(60)
      .lean();

    for (const candidate of fillCandidates) {
      if (planned.length >= count) break;
      const id = candidate._id.toString();
      if (used.has(id)) continue;
      used.add(id);
      planned.push({ exercise: candidate._id, bodyPart: candidate.bodyPart });
    }
  }

  return planned.slice(0, count).map((item, idx) => ({
    ...item,
    order: idx + 1,
    suggested: true,
  }));
};

export const startSession = async (userId, { gymId, qrToken }) => {
  const booking = await Booking.findOne({
    user: userId,
    gym: gymId,
    status: "active",
    endsAt: { $gte: new Date() },
  }).lean();

  if (!booking) {
    throw new AppError("Active booking not found", StatusCodes.BAD_REQUEST);
  }

  const gym = await Gym.findOne({ _id: gymId, qrToken, isActive: true })
    .select("name trainers")
    .lean();

  if (!gym) {
    throw new AppError("Invalid QR or gym", StatusCodes.BAD_REQUEST);
  }

  // Idempotent start: if a session is already pending/active for this booking, return it.
  const existingSession = await WorkoutSession.findOne({
    member: userId,
    gym: gymId,
    booking: booking._id,
    status: { $in: ["pending", "active"] },
  })
    .sort({ startedAt: -1 })
    .lean();

  if (existingSession) {
    emitToUser(userId, "session:status", { sessionId: existingSession._id.toString(), status: existingSession.status });
    return existingSession;
  }

  const session = await WorkoutSession.create({
    member: userId,
    gym: gymId,
    booking: booking._id,
    status: "pending",
  });

  if (gym.trainers.length) {
    const trainerId = gym.trainers[0];
    await Promise.all([
      TrainerRequest.create({
        session: session._id,
        gym: gymId,
        member: userId,
        trainer: trainerId,
      }),
      Notification.create({
        user: trainerId,
        title: "New trainer request",
        message: `A member has started a session at ${gym.name}.`,
        type: "trainer_request",
      }),
    ]);
  }

  emitToUser(userId, "session:status", { sessionId: session._id.toString(), status: "pending" });

  return session.toObject();
};

export const getTrainerRequests = async (trainerId) =>
  (async () => {
    const requests = await TrainerRequest.find({ trainer: trainerId, status: "pending" })
      .populate("member", "fullName phone")
      .populate("gym", "name location.city")
      .populate("session", "status startedAt")
      .sort({ createdAt: -1 })
      .lean();

    if (!requests.length) {
      return [];
    }

    const memberIds = Array.from(new Set(requests.map((r) => r.member?._id?.toString()).filter(Boolean)));
    const programs = await MemberProgram.find({ member: { $in: memberIds } })
      .sort({ updatedAt: -1 })
      .lean();

    const latestProgramByMember = new Map();
    for (const program of programs) {
      const key = program.member.toString();
      if (!latestProgramByMember.has(key)) {
        latestProgramByMember.set(key, program);
      }
    }

    return requests.map((request) => {
      const memberKey = request.member?._id?.toString();
      const program = memberKey ? latestProgramByMember.get(memberKey) : null;
      return { ...request, lastProgram: program || null };
    });
  })();

export const getTrainerProgramOptions = async () => {
  const docs = await WorkoutType.find({ isActive: true }).select("modeType goal").lean();
  const modeTypes = Array.from(new Set(docs.map((d) => normalizeUpper(d.modeType)).filter(Boolean))).sort();
  return { modeTypes };
};

export const getTrainerActiveSessions = async (trainerId) =>
  WorkoutSession.find({ assignedTrainer: trainerId, status: "active" })
    .populate("member", "fullName phone")
    .populate("gym", "name location.city")
    .populate("plannedExercises.exercise", "name bodyPart mode difficulty goal")
    .sort({ startedAt: -1 })
    .lean();

export const getTrainerExerciseCatalog = async (trainerId, sessionId) => {
  const session = await WorkoutSession.findOne({ _id: sessionId, assignedTrainer: trainerId, status: "active" })
    .select("gym program plannedExercises")
    .lean();

  if (!session) {
    throw new AppError("Session not found", StatusCodes.NOT_FOUND);
  }

  const gym = await Gym.findById(session.gym).select("equipmentIds").lean();
  const allowedEquipmentIds = gym?.equipmentIds || [];

  const targets =
    session.program?.target?.length
      ? session.program.target
      : (session.plannedExercises || []).map((item) => item.bodyPart).filter(Boolean);

  const uniqueTargets = Array.from(new Set(targets.map(normalizeUpper).filter(Boolean)));

  const filter = {
    isActive: true,
    ...(uniqueTargets.length ? { bodyPart: { $in: uniqueTargets } } : {}),
    $or: [
      { equipmentId: null },
      ...(allowedEquipmentIds.length ? [{ equipmentId: { $in: allowedEquipmentIds } }] : []),
    ],
  };

  return Exercise.find(filter)
    .select("_id name bodyPart mode difficulty goal")
    .sort({ name: 1 })
    .lean();
};

export const addPlannedExercise = async (trainerId, sessionId, exerciseId) => {
  const session = await WorkoutSession.findOne({ _id: sessionId, assignedTrainer: trainerId, status: "active" });

  if (!session) {
    throw new AppError("Session not found", StatusCodes.NOT_FOUND);
  }

  const exercise = await Exercise.findOne({ _id: exerciseId, isActive: true })
    .select("_id bodyPart equipmentId")
    .lean();

  if (!exercise) {
    throw new AppError("Exercise not found", StatusCodes.NOT_FOUND);
  }

  if (exercise.equipmentId) {
    const gym = await Gym.findById(session.gym).select("equipmentIds").lean();
    const allowed = new Set((gym?.equipmentIds || []).map((id) => id.toString()));
    if (!allowed.has(exercise.equipmentId.toString())) {
      throw new AppError("This exercise equipment is not available in the selected gym", StatusCodes.BAD_REQUEST);
    }
  }

  const alreadyInPlan = (session.plannedExercises || []).some((item) => item.exercise?.toString() === exercise._id.toString());
  if (!alreadyInPlan) {
    const maxOrder = (session.plannedExercises || []).reduce((acc, item) => Math.max(acc, Number(item.order || 0)), 0);
    session.plannedExercises.push({
      exercise: exercise._id,
      bodyPart: exercise.bodyPart,
      order: maxOrder + 1,
      suggested: false,
    });
    await session.save();
  }

  return WorkoutSession.findById(session._id)
    .populate("member", "fullName phone")
    .populate("gym", "name location.city")
    .populate("plannedExercises.exercise", "name bodyPart mode difficulty goal")
    .lean();
};

export const removePlannedExercise = async (trainerId, sessionId, plannedId) => {
  const session = await WorkoutSession.findOne({ _id: sessionId, assignedTrainer: trainerId, status: "active" });

  if (!session) {
    throw new AppError("Session not found", StatusCodes.NOT_FOUND);
  }

  const planned = session.plannedExercises?.id(plannedId);
  if (!planned) {
    throw new AppError("Planned exercise not found", StatusCodes.NOT_FOUND);
  }

  planned.deleteOne();

  const sorted = (session.plannedExercises || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  sorted.forEach((item, idx) => {
    item.order = idx + 1;
  });

  await session.save();

  return WorkoutSession.findById(session._id)
    .populate("member", "fullName phone")
    .populate("gym", "name location.city")
    .populate("plannedExercises.exercise", "name bodyPart mode difficulty goal")
    .lean();
};

export const respondToTrainerRequest = async (trainerId, { requestId, decision, modeType }) => {
  const trainerRequest = await TrainerRequest.findOne({
    _id: requestId,
    trainer: trainerId,
    status: "pending",
  });

  if (!trainerRequest) {
    throw new AppError("Trainer request not found", StatusCodes.NOT_FOUND);
  }

  if (decision === "accepted") {
    const selectedModeType = normalizeUpper(modeType);

    let program = null;

    if (selectedModeType) {
      program = await MemberProgram.findOne({ member: trainerRequest.member, modeType: selectedModeType })
        .sort({ updatedAt: -1 })
        .lean();
    } else {
      // Continue the most recently-used program if present.
      program = await MemberProgram.findOne({ member: trainerRequest.member }).sort({ updatedAt: -1 }).lean();
    }

    const effectiveModeType = selectedModeType || program?.modeType;
    if (!effectiveModeType) {
      throw new AppError("Member program not found. Please select mode type first.", StatusCodes.BAD_REQUEST);
    }

    const cycleRaw = await WorkoutType.find({ modeType: effectiveModeType, isActive: true })
      .sort({ dayCycle: 1, createdAt: 1 })
      .lean();

    if (!cycleRaw.length) {
      throw new AppError("Workout type master is missing for the selected mode type", StatusCodes.BAD_REQUEST);
    }

    // If multiple goals exist in the master, de-duplicate by dayCycle.
    const cycleByDay = new Map();
    for (const doc of cycleRaw) {
      if (!cycleByDay.has(doc.dayCycle)) {
        cycleByDay.set(doc.dayCycle, doc);
      }
    }
    const cycle = Array.from(cycleByDay.values()).sort((a, b) => (a.dayCycle || 0) - (b.dayCycle || 0));

    const maxDay = cycle[cycle.length - 1].dayCycle || cycle.length;
    const nextDay = computeNextDay(program?.lastDayCycleCompleted || 0, maxDay);
    const dayDoc = cycle.find((item) => item.dayCycle === nextDay) || cycle[0];
    const targets = dayDoc.target || [];

    const plannedExercises = await pickExercisesForTargets({ gymId: trainerRequest.gym, targets, count: 6 });

    await WorkoutSession.findByIdAndUpdate(trainerRequest.session, {
      $set: {
        assignedTrainer: trainerId,
        status: "active",
        program: {
          modeType: effectiveModeType,
          dayCycle: dayDoc.dayCycle,
          target: targets,
        },
        plannedExercises,
      },
    });

    trainerRequest.status = "accepted";
    trainerRequest.respondedAt = new Date();
    await trainerRequest.save();
    emitToUser(trainerRequest.member, "session:status", { sessionId: trainerRequest.session.toString(), status: "active" });
  } else {
    trainerRequest.status = "rejected";
    trainerRequest.respondedAt = new Date();
    await trainerRequest.save();
    emitToUser(trainerRequest.member, "session:status", { sessionId: trainerRequest.session.toString(), status: "pending", rejected: true });
  }

  return trainerRequest.toObject();
};

export const getTodayWorkout = async (userId) =>
  WorkoutSession.findOne({ member: userId, status: { $in: ["pending", "active"] } })
    .populate("assignedTrainer", "fullName")
    .populate("gym", "name")
    .populate("booking", "endsAt status")
    .sort({ startedAt: -1 })
    .lean();

export const addExerciseToSession = async (sessionId, payload) => {
  const exercise = await Exercise.findById(payload.exercise).select("_id").lean();

  if (!exercise) {
    throw new AppError("Exercise not found", StatusCodes.NOT_FOUND);
  }

  const session = await WorkoutSession.findByIdAndUpdate(
    sessionId,
    { $push: { exercises: { ...payload, completedAt: new Date() } } },
    { new: true },
  ).lean();

  if (!session) {
    throw new AppError("Session not found", StatusCodes.NOT_FOUND);
  }

  return session;
};

export const endSession = async (sessionId) => {
  const session = await WorkoutSession.findByIdAndUpdate(
    sessionId,
    { $set: { status: "completed", endedAt: new Date() } },
    { new: true },
  ).lean();

  if (!session) {
    throw new AppError("Session not found", StatusCodes.NOT_FOUND);
  }

  if (session.program?.modeType && session.program?.dayCycle) {
    await MemberProgram.findOneAndUpdate(
      { member: session.member, modeType: normalizeUpper(session.program.modeType) },
      {
        $set: {
          lastDayCycleCompleted: Number(session.program.dayCycle) || 0,
          lastCompletedAt: new Date(),
          lastSession: session._id,
        },
        $setOnInsert: {
          member: session.member,
          modeType: normalizeUpper(session.program.modeType),
          goal: "DEFAULT",
        },
      },
      { upsert: true, new: true, sort: { updatedAt: -1 } },
    ).lean();
  }

  emitToUser(session.member, "session:status", { sessionId: session._id.toString(), status: "completed" });

  return session;
};

export const getSessionHistory = async (userId) =>
  WorkoutSession.find({ member: userId, status: "completed" })
    .populate("gym", "name")
    .populate("assignedTrainer", "fullName")
    .populate("exercises.exercise", "name bodyPart mode difficulty goal")
    .sort({ endedAt: -1 })
    .lean();
