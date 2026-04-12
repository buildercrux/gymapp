import mongoose from "mongoose";

const ownerBillingPlanSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    currency: { type: String, trim: true, uppercase: true, default: "INR" },
    price: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 1, max: 3650 },
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

ownerBillingPlanSchema.index({ isActive: 1, isDefault: -1, sortOrder: 1, price: 1 });
ownerBillingPlanSchema.index({ title: 1 }, { unique: true });

export const OwnerBillingPlan = mongoose.model("OwnerBillingPlan", ownerBillingPlanSchema);
