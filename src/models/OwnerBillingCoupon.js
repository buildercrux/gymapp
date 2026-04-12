import mongoose from "mongoose";

const ownerBillingCouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    type: { type: String, enum: ["percent", "amount"], required: true },
    value: { type: Number, required: true, min: 1 },
    bonusDays: { type: Number, default: 0, min: 0, max: 365 },
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

ownerBillingCouponSchema.index({ isActive: 1, expiresAt: 1 });

export const OwnerBillingCoupon = mongoose.model("OwnerBillingCoupon", ownerBillingCouponSchema);

