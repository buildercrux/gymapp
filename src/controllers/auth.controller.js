import { StatusCodes } from "http-status-codes";
import * as authService from "../services/auth.service.js";

export const sendSignupOtp = async (req, res) => {
  const result = await authService.sendSignupOtp(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const completeSignup = async (req, res) => {
  const result = await authService.completeSignup(req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: result });
};

export const login = async (req, res) => {
  const result = await authService.login(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const sendPasswordResetOtp = async (req, res) => {
  const result = await authService.sendPasswordResetOtp(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const completePasswordReset = async (req, res) => {
  const result = await authService.completePasswordReset(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const me = async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: user });
};
