import mongoose from "mongoose";

const specialistServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    type: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

specialistServiceSchema.index({ isActive: 1, type: 1, createdAt: -1 });

export const SpecialistService = mongoose.model("SpecialistService", specialistServiceSchema);
