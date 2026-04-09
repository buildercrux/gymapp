import mongoose from "mongoose";

const memberCheckInQuestionSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["yes_no", "rating_1_5", "number", "text", "select"],
      required: true,
      index: true,
    },
    options: { type: [String], default: [] }, // used when type === "select"
    required: { type: Boolean, default: false },
    frequencyDays: { type: Number, default: 1, min: 1, max: 365 },
    expected: { type: mongoose.Schema.Types.Mixed }, // { mode, value?, min?, max? }
    alertOnUnexpected: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

memberCheckInQuestionSchema.index({ gym: 1, isActive: 1, order: 1, createdAt: -1 });

export const MemberCheckInQuestion = mongoose.model("MemberCheckInQuestion", memberCheckInQuestionSchema);
