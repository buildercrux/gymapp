import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, enum: ["percent", "amount"], required: true },
    value: { type: Number, required: true, min: 1 },
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

couponSchema.index({ plan: 1, code: 1 }, { unique: true });
couponSchema.index({ gym: 1, code: 1 });

export const Coupon = mongoose.model("Coupon", couponSchema);

