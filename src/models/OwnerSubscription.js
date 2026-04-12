import mongoose from "mongoose";

const ownerSubscriptionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerBillingPlan" },
    status: {
      type: String,
      enum: ["pending", "trial", "active", "expired"],
      default: "pending",
      index: true,
    },
    trialUsedAt: { type: Date },
    welcomeOfferConsumedAt: { type: Date },
    trialEndsAt: { type: Date },
    endsAt: { type: Date },
    nextDueAt: { type: Date, index: true },
    lastPayment: {
      paidAt: Date,
      amountPaid: { type: Number, min: 0 },
      currency: { type: String, trim: true, uppercase: true },
      couponCode: { type: String, trim: true, uppercase: true },
      offer: {
        type: {
          type: String,
          enum: ["percent", "amount"],
        },
        value: { type: Number, min: 0 },
      },
      discountAmount: { type: Number, min: 0 },
      bonusDays: { type: Number, min: 0 },
    },
    couponHistory: {
      type: [
        {
          code: { type: String, trim: true, uppercase: true },
          appliedAt: { type: Date },
          discountAmount: { type: Number, min: 0 },
          bonusDays: { type: Number, min: 0 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true, versionKey: false },
);

ownerSubscriptionSchema.index({ owner: 1, status: 1 });

export const OwnerSubscription = mongoose.model("OwnerSubscription", ownerSubscriptionSchema);
