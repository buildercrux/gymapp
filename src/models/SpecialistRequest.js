import mongoose from "mongoose";

const specialistRequestSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "SpecialistService", required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "SpecialistPlan", required: true },
    memberProfiles: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          fullName: String,
          phone: String,
          email: String,
          profile: mongoose.Schema.Types.Mixed,
        },
      ],
      default: [],
    },
    applicationsCount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR" },
    pricePerApplication: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true, versionKey: false },
);

specialistRequestSchema.index({ owner: 1, createdAt: -1 });
specialistRequestSchema.index({ service: 1, status: 1, createdAt: -1 });
specialistRequestSchema.index({ gym: 1, status: 1, createdAt: -1 });

export const SpecialistRequest = mongoose.model("SpecialistRequest", specialistRequestSchema);
