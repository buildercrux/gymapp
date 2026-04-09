import mongoose from "mongoose";

const trainerRequestSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkoutSession",
      required: true,
      index: true,
    },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true,
    },
    respondedAt: Date,
  },
  { timestamps: true, versionKey: false },
);

trainerRequestSchema.index({ trainer: 1, status: 1, createdAt: -1 });

export const TrainerRequest = mongoose.model("TrainerRequest", trainerRequestSchema);
