import mongoose from "mongoose";

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    bodyPart: { type: String, required: true, index: true },
    mode: { type: String, index: true },
    difficulty: {
      type: String,
      index: true,
    },
    goal: { type: String, index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", index: true },
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exercise" }],
    equipment: [String],
    alternatives: [String],
    instructions: [String],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

exerciseSchema.index({ isActive: 1, bodyPart: 1, difficulty: 1, name: 1 });
exerciseSchema.index({ isActive: 1, goal: 1, mode: 1, bodyPart: 1 });

export const Exercise = mongoose.model("Exercise", exerciseSchema);
