import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";
import { User } from "../models/User.js";
import { UserProfile } from "../models/UserProfile.js";

export const upsertProfile = async (userId, payload) => {
  const profileUpdates = { ...payload };
  delete profileUpdates.fullName;
  delete profileUpdates.email;

  const profile = await UserProfile.findOneAndUpdate(
    { user: userId },
    { $set: profileUpdates },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  if (payload.fullName || payload.email) {
    await User.findByIdAndUpdate(userId, {
      $set: {
        ...(payload.fullName ? { fullName: payload.fullName } : {}),
        ...(payload.email ? { email: payload.email } : {}),
      },
    });
  }

  return profile;
};

export const getProfile = async (userId) => {
  const profile = await UserProfile.findOne({ user: userId }).lean();

  if (!profile) {
    throw new AppError("Profile not found", StatusCodes.NOT_FOUND);
  }

  return profile;
};
