import mongoose from "mongoose";
import { ROLES } from "../constants/roles.js";

const normalizeOptionalText = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
};

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true, set: normalizeOptionalText },
    fullName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, set: normalizeOptionalText },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: Date,
  },
  { timestamps: true, versionKey: false },
);

userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, isActive: 1 });

export const User = mongoose.model("User", userSchema);
