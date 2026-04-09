import mongoose from "mongoose";

export const ACCOUNT_TYPES = ["income", "expense"];
export const TRANSACTION_CATEGORIES = ["membership", "pt", "supplement", "salary", "maintenance", "rent", "bills", "other"];

const transactionSchema = new mongoose.Schema(
  {
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    transactionId: { type: String, required: true, trim: true, uppercase: true, index: true, unique: true },
    accountType: { type: String, enum: ACCOUNT_TYPES, required: true, index: true },
    category: { type: String, required: true, trim: true, maxlength: 60, index: true },
    entityUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    entityRole: { type: String, enum: ["member", "staff"] },
    entityName: { type: String, trim: true, maxlength: 120 },
    comment: { type: String, trim: true, maxlength: 500 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0 },
    periodStart: { type: Date },
    periodEnd: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

transactionSchema.index({ gym: 1, createdAt: -1 });
transactionSchema.index({ gym: 1, accountType: 1, createdAt: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
