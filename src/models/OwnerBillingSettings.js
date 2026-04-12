import mongoose from "mongoose";

const ownerBillingSettingsSchema = new mongoose.Schema(
  {
    welcomeOfferEnabled: { type: Boolean, default: false },
    welcomeOfferType: { type: String, enum: ["percent", "amount"], default: "percent" },
    welcomeOfferValue: { type: Number, default: 0, min: 0 },
    welcomeOfferAllowTrial: { type: Boolean, default: true }, // legacy
    welcomeOfferMessage: { type: String, trim: true, default: "" },
    welcomeOfferExpiresAt: { type: Date },
    renewalReminderDays: { type: Number, default: 7, min: 0, max: 365 },
    trialEnabled: { type: Boolean, default: true },
    trialDays: { type: Number, default: 7, min: 0, max: 365 },
    trialPayLaterEnabled: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

export const OwnerBillingSettings = mongoose.model("OwnerBillingSettings", ownerBillingSettingsSchema);
