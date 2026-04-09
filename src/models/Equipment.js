import mongoose from "mongoose";

const rangeSchema = new mongoose.Schema(
  {
    min: Number,
    max: Number,
    unit: { type: String, default: "KG" },
  },
  { _id: false },
);

const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    category: {
      type: String,
      default: "FREE_WEIGHT",
      index: true,
    },
    type: { type: String, trim: true },
    bodyPartsSupported: [{ type: String, index: true }],
    movementType: {
      type: String,
      default: "COMPOUND",
      index: true,
    },
    loadType: {
      type: String,
      default: "ADJUSTABLE",
      index: true,
    },
    weightRange: rangeSchema,
    weightSteps: Number,
    adjustableSettings: {
      seatHeight: Boolean,
      inclineLevels: [Number],
      handlePositions: Boolean,
    },
    cardioFeatures: {
      speedRange: rangeSchema,
      inclineRange: rangeSchema,
    },
    usageType: { type: String, default: "SHARED", index: true },
    difficulty: { type: String, default: "BEGINNER", index: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    // Backward compat: old field used by early versions of Masters.
    property: { type: mongoose.Schema.Types.Mixed },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

equipmentSchema.index({ isActive: 1, name: 1 });
equipmentSchema.index({ isActive: 1, category: 1, movementType: 1 });

export const Equipment = mongoose.model("Equipment", equipmentSchema);
