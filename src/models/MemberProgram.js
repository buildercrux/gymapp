import mongoose from "mongoose";

const memberProgramSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    modeType: { type: String, required: true, index: true },
    // Backward compat: previously used to segment programs. We no longer require it in the flow.
    goal: { type: String, default: "DEFAULT", index: true },
    lastDayCycleCompleted: { type: Number, default: 0 },
    lastCompletedAt: Date,
    lastSession: { type: mongoose.Schema.Types.ObjectId, ref: "WorkoutSession" },
  },
  { timestamps: true, versionKey: false },
);

memberProgramSchema.index({ member: 1, modeType: 1, goal: 1 }, { unique: true });
memberProgramSchema.index({ member: 1, updatedAt: -1 });

export const MemberProgram = mongoose.model("MemberProgram", memberProgramSchema);
