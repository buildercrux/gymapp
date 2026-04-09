import { StatusCodes } from "http-status-codes";
import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";
import { AppError } from "../errors/AppError.js";
import { Otp } from "../models/Otp.js";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { isEmailDeliveryConfigured, sendOtpEmail } from "./email.service.js";
import { generateOtpCode } from "./otp.service.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import { createTokenId, signAccessToken } from "./token.service.js";

const buildExpiresAt = (minutes) => new Date(Date.now() + minutes * 60 * 1000);
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const sanitizeUser = (user) => {
  const plainUser = user.toObject ? user.toObject() : user;
  const { passwordHash, ...safeUser } = plainUser;
  return safeUser;
};

const createSessionForUser = async (user) => {
  const tokenId = createTokenId();
  const token = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    tokenId,
  });

  await Session.create({
    user: user._id,
    tokenId,
    expiresAt: buildExpiresAt(60 * 24 * 7),
    lastSeenAt: new Date(),
  });

  return { token, user: sanitizeUser(user) };
};

const generateEmailOtp = async ({ email, purpose }) => {
  const normalizedEmail = normalizeEmail(email);
  const otpCode = env.demoOtpMode ? env.demoOtp : generateOtpCode();
  await Otp.deleteMany({ email: normalizedEmail, purpose });

  await Otp.create({
    email: normalizedEmail,
    purpose,
    code: otpCode,
    expiresAt: buildExpiresAt(10),
  });

  if (env.demoOtpMode) {
    return {
      email: normalizedEmail,
      code: otpCode,
      deliveryMode: "demo",
      message: "OTP generated in demo mode",
    };
  }

  if (!isEmailDeliveryConfigured()) {
    throw new AppError("Email OTP delivery is not configured", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  try {
    await sendOtpEmail({ to: normalizedEmail, code: otpCode });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to send OTP email:", error);
    throw new AppError("Unable to send OTP email right now", StatusCodes.BAD_GATEWAY, {
      code: error?.code || null,
      command: error?.command || null,
      responseCode: error?.responseCode || null,
    });
  }

  return {
    email: normalizedEmail,
    deliveryMode: "smtp",
    message: "OTP sent successfully",
  };
};

const consumeOtp = async ({ email, code, purpose }) => {
  const normalizedEmail = normalizeEmail(email);
  const otp = await Otp.findOne({ email: normalizedEmail, purpose }).sort({ createdAt: -1 });

  if (!otp || otp.code !== code || otp.expiresAt < new Date()) {
    throw new AppError("Invalid or expired OTP", StatusCodes.UNAUTHORIZED);
  }

  otp.verifiedAt = new Date();
  await otp.save();
  return normalizedEmail;
};

export const sendSignupOtp = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();

  if (existingUser) {
    throw new AppError("Account already exists for this email", StatusCodes.CONFLICT);
  }

  return generateEmailOtp({ email: normalizedEmail, purpose: "signup" });
};

export const completeSignup = async ({ email, code, phone, password, fullName, role }) => {
  const normalizedEmail = await consumeOtp({ email, code, purpose: "signup" });
  const normalizedPhone = normalizePhone(phone);
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();

  if (existingUser) {
    throw new AppError("Account already exists for this email", StatusCodes.CONFLICT);
  }

  if (normalizedPhone) {
    const existingPhoneUser = await User.findOne({ phone: normalizedPhone }).lean();

    if (existingPhoneUser) {
      throw new AppError("Account already exists for this phone number", StatusCodes.CONFLICT);
    }
  }

  const user = await User.create({
    email: normalizedEmail,
    ...(normalizedPhone ? { phone: normalizedPhone } : {}),
    fullName,
    role: role || ROLES.MEMBER,
    passwordHash: hashPassword(password),
    lastLoginAt: new Date(),
  });

  return createSessionForUser(user);
};

export const login = async ({ email, phone, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const lookupFilters = [];

  if (normalizedEmail) {
    lookupFilters.push({ email: normalizedEmail });
  }

  if (normalizedPhone) {
    lookupFilters.push({ phone: normalizedPhone });
  }

  if (!lookupFilters.length) {
    throw new AppError("Email or phone is required", StatusCodes.BAD_REQUEST);
  }

  const user = await User.findOne(lookupFilters.length === 1 ? lookupFilters[0] : { $or: lookupFilters });

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw new AppError("Invalid email/phone or password", StatusCodes.UNAUTHORIZED);
  }

  user.lastLoginAt = new Date();
  await user.save();

  return createSessionForUser(user);
};

export const sendPasswordResetOtp = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).lean();

  if (!user) {
    throw new AppError("Account not found for this email", StatusCodes.NOT_FOUND);
  }

  return generateEmailOtp({ email: normalizedEmail, purpose: "password-reset" });
};

export const completePasswordReset = async ({ email, code, password }) => {
  const normalizedEmail = await consumeOtp({ email, code, purpose: "password-reset" });
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new AppError("Account not found for this email", StatusCodes.NOT_FOUND);
  }

  user.passwordHash = hashPassword(password);
  user.lastLoginAt = new Date();
  await user.save();

  return createSessionForUser(user);
};

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).lean();

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  return sanitizeUser(user);
};
