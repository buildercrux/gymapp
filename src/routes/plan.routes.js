import { Router } from "express";
import * as planController from "../controllers/plan.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { bookingSchema, createPlanSchema, planIdSchema, updatePlanSchema } from "../validators/plan.validator.js";

const router = Router();

router.get("/", asyncHandler(planController.getPlans));
router.post(
  "/create",
  authenticate,
  authorize("owner", "admin"),
  validate(createPlanSchema),
  asyncHandler(planController.createPlan),
);
router.put(
  "/:planId",
  authenticate,
  authorize("owner", "admin"),
  validate(updatePlanSchema),
  asyncHandler(planController.updatePlan),
);
router.delete(
  "/:planId",
  authenticate,
  authorize("owner", "admin"),
  validate(planIdSchema),
  asyncHandler(planController.removePlan),
);
router.post("/booking/create", authenticate, validate(bookingSchema), asyncHandler(planController.createBooking));
router.get("/booking/my", authenticate, asyncHandler(planController.getMyBookings));
router.get("/booking/all", authenticate, authorize("admin"), asyncHandler(planController.getAllBookings));

export default router;
