import { Router } from "express";
import * as workoutController from "../controllers/workout.controller.js";
import { ROLES } from "../constants/roles.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addExerciseSchema,
  plannedExerciseAddSchema,
  plannedExerciseRemoveSchema,
  sessionIdSchema,
  startSessionSchema,
  trainerDecisionSchema,
  trainerSessionIdSchema,
} from "../validators/workout.validator.js";

const router = Router();

router.post("/session/start", authenticate, validate(startSessionSchema), asyncHandler(workoutController.startSession));
router.get("/trainer/requests", authenticate, authorize(ROLES.TRAINER), asyncHandler(workoutController.getTrainerRequests));
router.get("/trainer/program/options", authenticate, authorize(ROLES.TRAINER), asyncHandler(workoutController.getTrainerProgramOptions));
router.get("/trainer/sessions/active", authenticate, authorize(ROLES.TRAINER), asyncHandler(workoutController.getTrainerActiveSessions));
router.get("/trainer/session/:sessionId/exercises/catalog", authenticate, authorize(ROLES.TRAINER), validate(trainerSessionIdSchema), asyncHandler(workoutController.getTrainerExerciseCatalog));
router.post("/trainer/session/:sessionId/planned-exercises", authenticate, authorize(ROLES.TRAINER), validate(plannedExerciseAddSchema), asyncHandler(workoutController.addPlannedExercise));
router.delete("/trainer/session/:sessionId/planned-exercises/:plannedId", authenticate, authorize(ROLES.TRAINER), validate(plannedExerciseRemoveSchema), asyncHandler(workoutController.removePlannedExercise));
router.post("/trainer/request/respond", authenticate, authorize(ROLES.TRAINER), validate(trainerDecisionSchema), asyncHandler(workoutController.respondToTrainerRequest));
router.get("/workout/today", authenticate, asyncHandler(workoutController.getTodayWorkout));
router.post("/session/:sessionId/exercise/add", authenticate, validate(addExerciseSchema), asyncHandler(workoutController.addExercise));
router.post("/session/:sessionId/end", authenticate, validate(sessionIdSchema), asyncHandler(workoutController.endSession));
router.get("/session/history", authenticate, asyncHandler(workoutController.getSessionHistory));

export default router;
