import mongoose from "mongoose";

const pricingTierSchema = new mongoose.Schema(
  {
    minApplications: { type: Number, required: true, min: 1 },
    pricePerApplication: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const specialistPlanSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: "SpecialistService", required: true, index: true },
    title: { type: String, required: true, trim: true },
    currency: { type: String, default: "INR" },
    pricingTiers: { type: [pricingTierSchema], default: [] },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

specialistPlanSchema.index({ service: 1, isActive: 1, createdAt: -1 });

export const SpecialistPlan = mongoose.model("SpecialistPlan", specialistPlanSchema);
