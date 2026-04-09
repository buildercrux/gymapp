import mongoose from "mongoose";

export const PLAN_DURATION_OPTIONS = {
  "1-day": { label: "1 day", days: 1 },
  "3-day": { label: "3 day", days: 3 },
  weekly: { label: "Weekly", days: 7 },
  monthly: { label: "Monthly", days: 30 },
  "3-months": { label: "3 months", days: 90 },
  "6-months": { label: "6 months", days: 180 },
  "9-months": { label: "9 months", days: 270 },
  "12-months": { label: "12 months", days: 365 },
  custom: { label: "Custom", days: null },
};

const planSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    title: { type: String, required: true, trim: true },
    durationKey: {
      type: String,
      enum: Object.keys(PLAN_DURATION_OPTIONS),
      required: true,
    },
    durationLabel: { type: String, required: true, trim: true },
    durationDays: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    features: [String],
    coupons: {
      type: [
        {
          code: { type: String, required: true, trim: true, uppercase: true },
          type: { type: String, enum: ["percent", "amount"], required: true },
          value: { type: Number, required: true, min: 1 },
          maxUses: { type: Number, min: 1 },
          usedCount: { type: Number, default: 0, min: 0 },
          expiresAt: { type: Date },
          isActive: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    timeSlots: {
      type: [
        {
          startTime: { type: String, required: true, trim: true },
          durationMinutes: { type: Number, required: true, min: 5, max: 600 },
          capacity: { type: Number, min: 1, max: 10000 },
        },
      ],
      default: [],
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

planSchema.index({ gym: 1, isActive: 1, durationDays: 1, price: 1 });

export const Plan = mongoose.model("Plan", planSchema);
