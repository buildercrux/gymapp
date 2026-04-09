import mongoose from "mongoose";

const tierSchema = new mongoose.Schema(
  {
    minApplications: { type: Number, required: true },
    pricePerApplication: { type: Number, required: true },
  },
  { _id: false },
);

const specialistPricingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    currency: { type: String, default: "INR" },
    tiers: { type: [tierSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const SpecialistPricing = mongoose.model("SpecialistPricing", specialistPricingSchema);
