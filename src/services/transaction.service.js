import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";
import { Gym } from "../models/Gym.js";
import { Transaction } from "../models/Transaction.js";

const assertGymAccess = async (actorId, actorRole, gymId) => {
  const gymFilter = actorRole === "admin" ? { _id: gymId } : { _id: gymId, owner: actorId };
  const gym = await Gym.findOne(gymFilter).select("_id").lean();
  if (!gym) {
    throw new AppError("Gym not found for this owner", StatusCodes.NOT_FOUND);
  }
};

const buildTransactionId = () => {
  const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `TXN-${dateKey}-${random}`;
};

const createUniqueTransactionId = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const transactionId = buildTransactionId();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Transaction.exists({ transactionId });
    if (!exists) return transactionId;
  }
  return buildTransactionId();
};

export const listTransactions = async ({ actorId, actorRole, gymId, accountType, category, from, to }) => {
  await assertGymAccess(actorId, actorRole, gymId);

  const createdAt = {};
  if (from instanceof Date && !Number.isNaN(from.getTime())) createdAt.$gte = from;
  if (to instanceof Date && !Number.isNaN(to.getTime())) createdAt.$lte = to;

  const filter = {
    gym: gymId,
    ...(accountType ? { accountType } : {}),
    ...(category ? { category } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };

  const rows = await Transaction.find(filter)
    .populate("entityUser", "fullName phone email role")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return rows;
};

export const createTransaction = async ({
  actorId,
  actorRole,
  gymId,
  accountType,
  category,
  entityUserId,
  entityRole,
  entityName,
  comment,
  totalAmount,
  paidAmount,
  periodStart,
  periodEnd,
}) => {
  await assertGymAccess(actorId, actorRole, gymId);

  const safeCategory = String(category || "").trim();
  if (!safeCategory) {
    throw new AppError("Category is required", StatusCodes.BAD_REQUEST);
  }

  if (typeof totalAmount !== "number" || typeof paidAmount !== "number") {
    throw new AppError("Amounts must be numbers", StatusCodes.BAD_REQUEST);
  }
  if (paidAmount > totalAmount) {
    throw new AppError("Paid amount cannot be greater than total amount", StatusCodes.BAD_REQUEST);
  }

  const transactionId = await createUniqueTransactionId();

  const safeEntityName = String(entityName || "").trim();
  const safeComment = String(comment || "").trim();

  const doc = await Transaction.create({
    gym: gymId,
    transactionId,
    accountType,
    category: safeCategory,
    ...(entityUserId ? { entityUser: entityUserId } : {}),
    ...(entityRole ? { entityRole } : {}),
    ...(!entityUserId && safeEntityName ? { entityName: safeEntityName } : {}),
    ...(safeComment ? { comment: safeComment } : {}),
    ...(periodStart instanceof Date ? { periodStart } : {}),
    ...(periodEnd instanceof Date ? { periodEnd } : {}),
    totalAmount,
    paidAmount,
  });

  const created = await Transaction.findById(doc._id).populate("entityUser", "fullName phone email role").lean();
  return created;
};

export const deleteTransaction = async ({ actorId, actorRole, gymId, transactionId }) => {
  await assertGymAccess(actorId, actorRole, gymId);

  const existing = await Transaction.findOne({ _id: transactionId, gym: gymId }).select("_id").lean();
  if (!existing) {
    throw new AppError("Transaction not found for this gym", StatusCodes.NOT_FOUND);
  }

  await Transaction.deleteOne({ _id: transactionId, gym: gymId });
  return { transactionId, deleted: true };
};

export const updateTransaction = async ({
  actorId,
  actorRole,
  gymId,
  transactionId,
  accountType,
  category,
  entityUserId,
  entityRole,
  entityName,
  comment,
  totalAmount,
  paidAmount,
  periodStart,
  periodEnd,
}) => {
  await assertGymAccess(actorId, actorRole, gymId);

  const existing = await Transaction.findOne({ _id: transactionId, gym: gymId })
    .select("totalAmount paidAmount")
    .lean();
  if (!existing) {
    throw new AppError("Transaction not found for this gym", StatusCodes.NOT_FOUND);
  }

  const nextTotal = typeof totalAmount === "number" ? totalAmount : existing.totalAmount;
  const nextPaid = typeof paidAmount === "number" ? paidAmount : existing.paidAmount;
  if (typeof nextTotal !== "number" || typeof nextPaid !== "number") {
    throw new AppError("Amounts must be numbers", StatusCodes.BAD_REQUEST);
  }
  if (nextPaid > nextTotal) {
    throw new AppError("Paid amount cannot be greater than total amount", StatusCodes.BAD_REQUEST);
  }

  const set = {};
  const unset = {};

  if (accountType) set.accountType = accountType;
  if (typeof category !== "undefined") {
    const safeCategory = String(category || "").trim();
    if (!safeCategory) {
      throw new AppError("Category is required", StatusCodes.BAD_REQUEST);
    }
    set.category = safeCategory;
  }
  if (typeof totalAmount === "number") set.totalAmount = totalAmount;
  if (typeof paidAmount === "number") set.paidAmount = paidAmount;

  if (periodStart instanceof Date) set.periodStart = periodStart;
  if (periodEnd instanceof Date) set.periodEnd = periodEnd;

  const safeComment = typeof comment === "string" ? comment.trim() : "";
  if (typeof comment !== "undefined") {
    if (safeComment) set.comment = safeComment;
    else unset.comment = 1;
  }

  const safeEntityName = typeof entityName === "string" ? entityName.trim() : "";
  const safeEntityUserId = String(entityUserId || "").trim();
  const safeEntityRole = String(entityRole || "").trim();

  if (typeof entityUserId !== "undefined" || typeof entityRole !== "undefined" || typeof entityName !== "undefined") {
    if (safeEntityUserId) {
      set.entityUser = safeEntityUserId;
      if (safeEntityRole) set.entityRole = safeEntityRole;
      else unset.entityRole = 1;
      unset.entityName = 1;
    } else {
      unset.entityUser = 1;
      unset.entityRole = 1;
      if (safeEntityName) set.entityName = safeEntityName;
      else unset.entityName = 1;
    }
  }

  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;
  if (!Object.keys(update).length) {
    const row = await Transaction.findById(transactionId).populate("entityUser", "fullName phone email role").lean();
    return row;
  }

  const updated = await Transaction.findOneAndUpdate({ _id: transactionId, gym: gymId }, update, { new: true })
    .populate("entityUser", "fullName phone email role")
    .lean();

  return updated;
};
