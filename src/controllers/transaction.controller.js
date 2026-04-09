import { StatusCodes } from "http-status-codes";
import * as transactionService from "../services/transaction.service.js";

export const listTransactions = async (req, res) => {
  const rows = await transactionService.listTransactions({
    actorId: req.user.id,
    actorRole: req.user.role,
    gymId: req.validated.query.gymId,
    accountType: req.validated.query.accountType,
    category: req.validated.query.category,
    from: req.validated.query.from,
    to: req.validated.query.to,
  });
  res.status(StatusCodes.OK).json({ success: true, data: rows });
};

export const createTransaction = async (req, res) => {
  const row = await transactionService.createTransaction({
    actorId: req.user.id,
    actorRole: req.user.role,
    ...req.validated.body,
    entityUserId: String(req.validated.body.entityUserId || "").trim() || undefined,
    entityRole: String(req.validated.body.entityRole || "").trim() || undefined,
    entityName: String(req.validated.body.entityName || "").trim() || undefined,
  });
  res.status(StatusCodes.CREATED).json({ success: true, data: row });
};

export const deleteTransaction = async (req, res) => {
  const result = await transactionService.deleteTransaction({
    actorId: req.user.id,
    actorRole: req.user.role,
    transactionId: req.validated.params.transactionId,
    gymId: req.validated.body.gymId,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const updateTransaction = async (req, res) => {
  const row = await transactionService.updateTransaction({
    actorId: req.user.id,
    actorRole: req.user.role,
    transactionId: req.validated.params.transactionId,
    ...req.validated.body,
    entityUserId: String(req.validated.body.entityUserId || "").trim() || undefined,
    entityRole: String(req.validated.body.entityRole || "").trim() || undefined,
    entityName: String(req.validated.body.entityName || "").trim() || undefined,
    comment: String(req.validated.body.comment || "").trim() || undefined,
  });
  res.status(StatusCodes.OK).json({ success: true, data: row });
};
