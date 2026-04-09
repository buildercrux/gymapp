import mongoose from "mongoose";

const workoutTypeSchema = new mongoose.Schema(
  {
    modeType: {
      type: String,
      required: true,
      index: true,
    },
    dayCycle: { type: Number, required: true, min: 1, index: true },
    target: [{ type: String, required: true }],
    goal: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

workoutTypeSchema.index({ isActive: 1, modeType: 1, dayCycle: 1, goal: 1 });

export const WorkoutType = mongoose.model("WorkoutType", workoutTypeSchema);
