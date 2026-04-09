import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
      index: true,
    },
    timeSlotId: { type: mongoose.Schema.Types.ObjectId },
    slotStartTime: { type: String, trim: true },
    slotDurationMinutes: { type: Number, min: 5, max: 600 },
    listPrice: { type: Number, min: 0 },
    couponCode: { type: String, trim: true, uppercase: true },
    discountAmount: { type: Number, min: 0 },
    finalPrice: { type: Number, min: 0 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

bookingSchema.index({ user: 1, status: 1, endsAt: -1 });
bookingSchema.index({ gym: 1, status: 1 });

export const Booking = mongoose.model("Booking", bookingSchema);
