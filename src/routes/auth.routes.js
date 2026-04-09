import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  completePasswordResetSchema,
  completeSignupSchema,
  loginSchema,
  sendPasswordResetOtpSchema,
  sendSignupOtpSchema,
} from "../validators/auth.validator.js";

const router = Router();

router.post("/signup/send-otp", validate(sendSignupOtpSchema), asyncHandler(authController.sendSignupOtp));
router.post("/signup/complete", validate(completeSignupSchema), asyncHandler(authController.completeSignup));
router.post("/login", validate(loginSchema), asyncHandler(authController.login));
router.post("/password-reset/send-otp", validate(sendPasswordResetOtpSchema), asyncHandler(authController.sendPasswordResetOtp));
router.post("/password-reset/complete", validate(completePasswordResetSchema), asyncHandler(authController.completePasswordReset));
router.get("/me", authenticate, asyncHandler(authController.me));

export default router;
