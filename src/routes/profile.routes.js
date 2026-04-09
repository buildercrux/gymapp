import { Router } from "express";
import * as profileController from "../controllers/profile.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { profileSchema } from "../validators/profile.validator.js";

const router = Router();

router.post("/create", authenticate, validate(profileSchema), asyncHandler(profileController.createOrUpdateProfile));
router.get("/", authenticate, asyncHandler(profileController.getProfile));
router.put("/update", authenticate, validate(profileSchema), asyncHandler(profileController.createOrUpdateProfile));

export default router;
