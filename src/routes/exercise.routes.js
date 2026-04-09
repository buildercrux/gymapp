import { Router } from "express";
import * as exerciseController from "../controllers/exercise.controller.js";
import { ROLES } from "../constants/roles.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { exerciseCreateSchema, exerciseQuerySchema } from "../validators/exercise.validator.js";

const router = Router();

router.get("/", validate(exerciseQuerySchema), asyncHandler(exerciseController.getExercises));
router.post("/create", authenticate, authorize(ROLES.TRAINER, ROLES.OWNER, ROLES.ADMIN), validate(exerciseCreateSchema), asyncHandler(exerciseController.createExercise));

export default router;
