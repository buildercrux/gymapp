import { Exercise } from "../models/Exercise.js";

export const getExercises = async (filters) =>
  Exercise.find({
    isActive: true,
    ...(filters.bodyPart ? { bodyPart: filters.bodyPart } : {}),
    ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
  })
    .sort({ name: 1 })
    .lean();

export const createExercise = async (payload) => {
  const exercise = await Exercise.create(payload);
  return exercise.toObject();
};
