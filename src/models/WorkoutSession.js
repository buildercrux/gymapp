import mongoose from "mongoose";

const exerciseLogSchema = new mongoose.Schema(
  {
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise", required: true },
    sets: Number,
    reps: Number,
    weightKg: Number,
    durationMinutes: Number,
    notes: String,
    completedAt: Date,
  },
  { _id: true },
);

const plannedExerciseSchema = new mongoose.Schema(
  {
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise", required: true },
    bodyPart: String,
    order: { type: Number, default: 0 },
    suggested: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const workoutSessionSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    assignedTrainer: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    status: {
      type: String,
      enum: ["pending", "active", "completed"],
      default: "pending",
      index: true,
    },
    program: {
      modeType: String,
      dayCycle: Number,
      target: [String],
    },
    plannedExercises: [plannedExerciseSchema],
    exercises: [exerciseLogSchema],
    startedAt: { type: Date, default: Date.now, index: true },
    endedAt: Date,
  },
  { timestamps: true, versionKey: false },
);

workoutSessionSchema.index({ member: 1, startedAt: -1 });
workoutSessionSchema.index({ assignedTrainer: 1, status: 1 });
workoutSessionSchema.index({ gym: 1, status: 1, startedAt: -1 });
workoutSessionSchema.index({ "program.modeType": 1, "program.dayCycle": 1, startedAt: -1 });

export const WorkoutSession = mongoose.model("WorkoutSession", workoutSessionSchema);
