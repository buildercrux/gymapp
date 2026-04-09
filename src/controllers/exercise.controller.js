import { StatusCodes } from "http-status-codes";
import * as exerciseService from "../services/exercise.service.js";

export const getExercises = async (req, res) => {
  const exercises = await exerciseService.getExercises(req.validated.query);
  res.status(StatusCodes.OK).json({ success: true, data: exercises });
};

export const createExercise = async (req, res) => {
  const exercise = await exerciseService.createExercise(req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: exercise });
};
