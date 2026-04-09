import { StatusCodes } from "http-status-codes";
import * as workoutService from "../services/workout.service.js";

export const startSession = async (req, res) => {
  const session = await workoutService.startSession(req.user.id, req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: session });
};

export const getTrainerRequests = async (req, res) => {
  const requests = await workoutService.getTrainerRequests(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: requests });
};

export const getTrainerProgramOptions = async (_req, res) => {
  const options = await workoutService.getTrainerProgramOptions();
  res.status(StatusCodes.OK).json({ success: true, data: options });
};

export const getTrainerActiveSessions = async (req, res) => {
  const sessions = await workoutService.getTrainerActiveSessions(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: sessions });
};

export const getTrainerExerciseCatalog = async (req, res) => {
  const catalog = await workoutService.getTrainerExerciseCatalog(req.user.id, req.validated.params.sessionId);
  res.status(StatusCodes.OK).json({ success: true, data: catalog });
};

export const addPlannedExercise = async (req, res) => {
  const session = await workoutService.addPlannedExercise(req.user.id, req.validated.params.sessionId, req.validated.body.exerciseId);
  res.status(StatusCodes.OK).json({ success: true, data: session });
};

export const removePlannedExercise = async (req, res) => {
  const session = await workoutService.removePlannedExercise(req.user.id, req.validated.params.sessionId, req.validated.params.plannedId);
  res.status(StatusCodes.OK).json({ success: true, data: session });
};

export const respondToTrainerRequest = async (req, res) => {
  const request = await workoutService.respondToTrainerRequest(req.user.id, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: request });
};

export const getTodayWorkout = async (req, res) => {
  const workout = await workoutService.getTodayWorkout(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: workout });
};

export const addExercise = async (req, res) => {
  const session = await workoutService.addExerciseToSession(
    req.validated.params.sessionId,
    req.validated.body,
  );
  res.status(StatusCodes.OK).json({ success: true, data: session });
};

export const endSession = async (req, res) => {
  const session = await workoutService.endSession(req.validated.params.sessionId);
  res.status(StatusCodes.OK).json({ success: true, data: session });
};

export const getSessionHistory = async (req, res) => {
  const history = await workoutService.getSessionHistory(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: history });
};
