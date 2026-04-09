import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenId: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    lastSeenAt: Date,
  },
  { timestamps: true, versionKey: false },
);

sessionSchema.index({ user: 1, expiresAt: -1 });

export const Session = mongoose.model("Session", sessionSchema);
