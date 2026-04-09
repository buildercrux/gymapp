import mongoose from "mongoose";

const gymSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    assetId: { type: String, trim: true, default: "" },
    assetKeySalt: { type: String, default: "" },
    assetKeyHash: { type: String, default: "" },
    // Permission levels: 0 = none, 1 = view, 2 = edit. (Legacy booleans supported: true => edit, false => none)
    assetPermissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        overview: 1,
        plans: 2,
        trainers: 2,
        members: 2,
        equipment: 2,
        specialists: 2,
      },
    },
    location: {
      address: String,
      city: String,
      state: String,
      country: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    amenities: [String],
    trainers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    equipmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Equipment", index: true }],
    qrToken: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

gymSchema.index({ owner: 1, createdAt: -1 });
gymSchema.index({ slug: 1 }, { unique: true });
gymSchema.index({ trainers: 1, isActive: 1 });
gymSchema.index({ equipmentIds: 1, isActive: 1 });
gymSchema.index({ "location.coordinates.latitude": 1, "location.coordinates.longitude": 1 });

export const Gym = mongoose.model("Gym", gymSchema);
