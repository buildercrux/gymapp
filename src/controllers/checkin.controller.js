import { StatusCodes } from "http-status-codes";
import * as checkinService from "../services/checkin.service.js";

export const listSettings = async (req, res) => {
  const settings = await checkinService.listGymMemberCheckInSettings(req.user.id, req.user.role, req.validated.query.gymId);
  res.status(StatusCodes.OK).json({ success: true, data: settings });
};

export const updateSetting = async (req, res) => {
  const result = await checkinService.setGymMemberCheckInSetting(
    req.user.id,
    req.user.role,
    req.validated.body.gymId,
    req.validated.body.memberId,
    req.validated.body.enabled,
  );
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const listSettingsByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const settings = await checkinService.listGymMemberCheckInSettingsByAsset({
    gymId: req.validated.query.gymId,
    assetId,
    assetKey,
  });
  res.status(StatusCodes.OK).json({ success: true, data: settings });
};

export const updateSettingByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await checkinService.setGymMemberCheckInSettingByAsset({
    gymId: req.validated.body.gymId,
    assetId,
    assetKey,
    memberId: req.validated.body.memberId,
    enabled: req.validated.body.enabled,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const getPrompt = async (req, res) => {
  const prompt = await checkinService.getMemberCheckInPrompt(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: prompt });
};

export const submitDaily = async (req, res) => {
  const result = await checkinService.submitMemberDailyCheckIn(req.user.id, req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: result });
};

export const listQuestions = async (req, res) => {
  const questions = await checkinService.listGymQuestions(req.user.id, req.user.role, req.validated.query.gymId);
  res.status(StatusCodes.OK).json({ success: true, data: questions });
};

export const createQuestion = async (req, res) => {
  const question = await checkinService.createGymQuestion(req.user.id, req.user.role, req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: question });
};

export const updateQuestion = async (req, res) => {
  const question = await checkinService.updateGymQuestion(req.user.id, req.user.role, req.validated.params.questionId, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: question });
};

export const deleteQuestion = async (req, res) => {
  const result = await checkinService.deleteGymQuestion(req.user.id, req.user.role, req.validated.params.questionId);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const listAlerts = async (req, res) => {
  const result = await checkinService.listGymUnexpectedCheckIns(
    req.user.id,
    req.user.role,
    req.validated.query.gymId,
    req.validated.query.days,
  );
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const listMine = async (req, res) => {
  const result = await checkinService.listMemberDailyCheckIns(req.user.id, req.validated.query.gymId, req.validated.query.days);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const listSubmissions = async (req, res) => {
  const result = await checkinService.listGymDailyCheckIns(
    req.user.id,
    req.user.role,
    req.validated.query.gymId,
    req.validated.query.memberId,
    req.validated.query.days,
  );
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const listSubmissionsByAsset = async (req, res) => {
  const assetId = req.header("x-asset-id") || "";
  const assetKey = req.header("x-asset-key") || "";
  const result = await checkinService.listGymDailyCheckInsByAsset({
    gymId: req.validated.query.gymId,
    assetId,
    assetKey,
    memberId: req.validated.query.memberId,
    days: req.validated.query.days,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};
