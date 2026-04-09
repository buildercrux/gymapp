import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    purpose: { type: String, required: true, default: "auth", index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    verifiedAt: Date,
  },
  { timestamps: true, versionKey: false },
);

otpSchema.index({ phone: 1, purpose: 1, createdAt: -1 });
otpSchema.index({ email: 1, purpose: 1, createdAt: -1 });

export const Otp = mongoose.model("Otp", otpSchema);
