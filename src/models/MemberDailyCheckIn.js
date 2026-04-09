import mongoose from "mongoose";

const memberDailyCheckInSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dateKey: { type: Date, required: true, index: true },
    sleepHours: { type: Number, min: 0, max: 24 },
    sleepQuality: { type: Number, min: 1, max: 5 },
    waterLiters: { type: Number, min: 0, max: 20 },
    energy: { type: Number, min: 1, max: 5 },
    painScore: { type: Number, min: 0, max: 10 },
    painArea: { type: String, trim: true },
    workoutTime: { type: String, enum: ["none", "normal", "more_than_expected"], default: "none" },
    notes: { type: String, trim: true },
    customAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
    hasUnexpected: { type: Boolean, default: false, index: true },
    unexpectedCustomAnswers: {
      type: [
        {
          questionId: { type: mongoose.Schema.Types.ObjectId, ref: "MemberCheckInQuestion", required: true },
          label: String,
          answer: mongoose.Schema.Types.Mixed,
          expected: mongoose.Schema.Types.Mixed,
        },
      ],
      default: [],
    },
  },
  { timestamps: true, versionKey: false },
);

memberDailyCheckInSchema.index({ gym: 1, member: 1, dateKey: 1 }, { unique: true });
memberDailyCheckInSchema.index({ member: 1, dateKey: -1 });

export const MemberDailyCheckIn = mongoose.model("MemberDailyCheckIn", memberDailyCheckInSchema);
