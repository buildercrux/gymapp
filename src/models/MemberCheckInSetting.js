import mongoose from "mongoose";

const memberCheckInSettingSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    enabled: { type: Boolean, default: false, index: true },
    enabledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    enabledAt: Date,
  },
  { timestamps: true, versionKey: false },
);

memberCheckInSettingSchema.index({ gym: 1, member: 1 }, { unique: true });

export const MemberCheckInSetting = mongoose.model("MemberCheckInSetting", memberCheckInSettingSchema);

