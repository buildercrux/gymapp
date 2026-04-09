import { StatusCodes } from "http-status-codes";
import * as profileService from "../services/profile.service.js";

export const createOrUpdateProfile = async (req, res) => {
  const profile = await profileService.upsertProfile(req.user.id, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: profile });
};

export const getProfile = async (req, res) => {
  const profile = await profileService.getProfile(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: profile });
};
