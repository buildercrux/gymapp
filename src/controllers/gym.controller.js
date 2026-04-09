import { StatusCodes } from "http-status-codes";
import * as gymService from "../services/gym.service.js";

export const createGym = async (req, res) => {
  const gym = await gymService.createGym(req.user.id, req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: gym });
};

export const getMyGyms = async (req, res) => {
  const gyms = await gymService.getOwnerGyms(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: gyms });
};

export const getAllGyms = async (_req, res) => {
  const gyms = await gymService.getAllGymsAdmin();
  res.status(StatusCodes.OK).json({ success: true, data: gyms });
};

export const setGymActiveStatus = async (req, res) => {
  const gym = await gymService.setGymActiveStatusAdmin(req.validated.params.gymId, req.validated.body.isActive);
  res.status(StatusCodes.OK).json({ success: true, data: gym });
};

export const deleteGym = async (req, res) => {
  const result = await gymService.deleteGymAdmin(req.validated.params.gymId);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const getGymManagement = async (req, res) => {
  const result = await gymService.getOwnerGymManagement(req.user.id, req.user.role, req.validated.params.gymId);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const getGymManagementByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.getGymManagementByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const setGymAssetPermissions = async (req, res) => {
  const gym = await gymService.setGymAssetPermissions(
    req.user.id,
    req.user.role,
    req.validated.params.gymId,
    req.validated.body,
  );
  res.status(StatusCodes.OK).json({ success: true, data: gym });
};

export const getGymAssetPermissions = async (req, res) => {
  const permissions = await gymService.getGymAssetPermissions(req.user.id, req.user.role, req.validated.params.gymId);
  res.status(StatusCodes.OK).json({ success: true, data: permissions });
};

export const createPlanByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.createPlanByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    ...req.validated.body,
  });
  res.status(StatusCodes.CREATED).json({ success: true, data: result });
};

export const updatePlanByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.updatePlanByAsset({
    gymId: req.validated.params.gymId,
    planId: req.validated.params.planId,
    assetId,
    assetKey,
    ...req.validated.body,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const removePlanByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.removePlanByAsset({
    gymId: req.validated.params.gymId,
    planId: req.validated.params.planId,
    assetId,
    assetKey,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const setGymEquipmentByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.setGymEquipmentByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    equipmentIds: req.validated.body.equipmentIds,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const lookupTrainerByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const trainer = await gymService.lookupTrainerByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    email: req.validated.body.email,
  });
  res.status(StatusCodes.OK).json({ success: true, data: trainer });
};

export const sendTrainerEmailOtpByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.sendTrainerEmailOtpByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    email: req.validated.body.email,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const verifyTrainerEmailOtpByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.verifyTrainerEmailOtpByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    email: req.validated.body.email,
    code: req.validated.body.code,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const addTrainerToGymByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.addTrainerToGymByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    email: req.validated.body.email,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const removeTrainerFromGymByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.removeTrainerFromGymByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    trainerId: req.validated.body.trainerId,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const lookupMemberByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.lookupMemberByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    phone: req.validated.body.phone,
    email: req.validated.body.email,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const sendMemberEmailOtpByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.sendMemberEmailOtpByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    email: req.validated.body.email,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const verifyMemberEmailOtpByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.verifyMemberEmailOtpByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    email: req.validated.body.email,
    code: req.validated.body.code,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const enrollMemberByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.enrollMemberToGymPlanByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    ...req.validated.body,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const validateCouponByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.validateCouponByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    planId: req.validated.body.planId,
    couponCode: req.validated.body.couponCode,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const listCouponsByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.listCouponsByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    planId: req.validated.query?.planId,
    includeInactive: req.validated.query?.includeInactive,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const disableCouponByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.disableCouponByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    couponId: req.validated.params.couponId,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const listTransactionsByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.listTransactionsByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    ...(req.validated.query || {}),
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const createTransactionByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.createTransactionByAsset({
    gymId: req.validated.params.gymId,
    assetId,
    assetKey,
    ...req.validated.body,
  });
  res.status(StatusCodes.CREATED).json({ success: true, data: result });
};

export const updateTransactionByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.updateTransactionByAsset({
    gymId: req.validated.params.gymId,
    transactionId: req.validated.params.transactionId,
    assetId,
    assetKey,
    ...req.validated.body,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const deleteTransactionByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await gymService.deleteTransactionByAsset({
    gymId: req.validated.params.gymId,
    transactionId: req.validated.params.transactionId,
    assetId,
    assetKey,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const setGymEquipment = async (req, res) => {
  const gym = await gymService.setGymEquipment(
    req.user.id,
    req.user.role,
    req.validated.params.gymId,
    req.validated.body.equipmentIds,
  );
  res.status(StatusCodes.OK).json({ success: true, data: gym });
};

export const setGymAssetCredentials = async (req, res) => {
  const gym = await gymService.setGymAssetCredentials(
    req.user.id,
    req.user.role,
    req.validated.params.gymId,
    req.validated.body,
  );
  res.status(StatusCodes.OK).json({ success: true, data: gym });
};

export const getPublicGyms = async (_req, res) => {
  const gyms = await gymService.getPublicGyms();
  res.status(StatusCodes.OK).json({ success: true, data: gyms });
};

export const lookupTrainer = async (req, res) => {
  const trainer = await gymService.lookupTrainerForGym(req.user.id, req.user.role, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: trainer });
};

export const sendTrainerEmailOtp = async (req, res) => {
  const result = await gymService.sendTrainerEmailOtp(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const verifyTrainerEmailOtp = async (req, res) => {
  const result = await gymService.verifyTrainerEmailOtp(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const addTrainer = async (req, res) => {
  const gym = await gymService.addTrainerToGym(req.user.id, req.user.role, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: gym });
};

export const removeTrainer = async (req, res) => {
  const gym = await gymService.removeTrainerFromGym(req.user.id, req.user.role, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: gym });
};

export const lookupMember = async (req, res) => {
  const result = await gymService.lookupMember(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const enrollMember = async (req, res) => {
  const result = await gymService.enrollMemberToGymPlan(req.user.id, req.user.role, req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: result });
};

export const sendMemberEmailOtp = async (req, res) => {
  const result = await gymService.sendMemberEmailOtp(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const verifyMemberEmailOtp = async (req, res) => {
  const result = await gymService.verifyMemberEmailOtp(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const getGymQr = async (req, res) => {
  const result = await gymService.getGymQr(req.validated.params.gymId);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const getOwnerAnalytics = async (req, res) => {
  const result = await gymService.getOwnerAnalytics(req.user.id, req.validated.query?.days);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};
