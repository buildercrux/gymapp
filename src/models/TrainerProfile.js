import mongoose from "mongoose";

const trainerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    specialties: [String],
    bio: String,
    assignedGymIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Gym" }],
  },
  { timestamps: true, versionKey: false },
);

trainerProfileSchema.index({ assignedGymIds: 1 });

export const TrainerProfile = mongoose.model("TrainerProfile", trainerProfileSchema);
