import { Router } from "express";
import * as masterController from "../controllers/master.controller.js";
import { ROLES } from "../constants/roles.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  equipmentCreateSchema,
  equipmentDeleteSchema,
  equipmentUpdateSchema,
  exerciseMasterCreateSchema,
  exerciseMasterDeleteSchema,
  exerciseMasterUpdateSchema,
  specialistServiceCreateSchema,
  specialistServiceDeleteSchema,
  specialistServiceUpdateSchema,
  servicePlanCreateSchema,
  servicePlanDeleteSchema,
  servicePlanUpdateSchema,
  servicePlansListSchema,
  specialistPricingUpdateSchema,
  workoutTypeCreateSchema,
  workoutTypeDeleteSchema,
  workoutTypeUpdateSchema,
} from "../validators/master.validator.js";

const router = Router();

router.get("/equipment", authenticate, authorize(ROLES.ADMIN), asyncHandler(masterController.getEquipment));
router.post("/equipment", authenticate, authorize(ROLES.ADMIN), validate(equipmentCreateSchema), asyncHandler(masterController.createEquipment));
router.patch("/equipment/:equipmentId", authenticate, authorize(ROLES.ADMIN), validate(equipmentUpdateSchema), asyncHandler(masterController.updateEquipment));
router.delete("/equipment/:equipmentId", authenticate, authorize(ROLES.ADMIN), validate(equipmentDeleteSchema), asyncHandler(masterController.deleteEquipment));

router.get("/workout-types", authenticate, authorize(ROLES.ADMIN), asyncHandler(masterController.getWorkoutTypes));
router.post("/workout-types", authenticate, authorize(ROLES.ADMIN), validate(workoutTypeCreateSchema), asyncHandler(masterController.createWorkoutType));
router.patch("/workout-types/:workoutTypeId", authenticate, authorize(ROLES.ADMIN), validate(workoutTypeUpdateSchema), asyncHandler(masterController.updateWorkoutType));
router.delete("/workout-types/:workoutTypeId", authenticate, authorize(ROLES.ADMIN), validate(workoutTypeDeleteSchema), asyncHandler(masterController.deleteWorkoutType));

router.get("/exercises", authenticate, authorize(ROLES.ADMIN), asyncHandler(masterController.getExerciseMasters));
router.post("/exercises", authenticate, authorize(ROLES.ADMIN), validate(exerciseMasterCreateSchema), asyncHandler(masterController.createExerciseMaster));
router.patch("/exercises/:exerciseId", authenticate, authorize(ROLES.ADMIN), validate(exerciseMasterUpdateSchema), asyncHandler(masterController.updateExerciseMaster));
router.delete("/exercises/:exerciseId", authenticate, authorize(ROLES.ADMIN), validate(exerciseMasterDeleteSchema), asyncHandler(masterController.deleteExerciseMaster));

router.get("/specialist-pricing", authenticate, authorize(ROLES.ADMIN), asyncHandler(masterController.getSpecialistPricing));
router.put("/specialist-pricing", authenticate, authorize(ROLES.ADMIN), validate(specialistPricingUpdateSchema), asyncHandler(masterController.setSpecialistPricing));

router.get("/specialist-services", authenticate, authorize(ROLES.ADMIN), asyncHandler(masterController.getSpecialistServices));
router.post("/specialist-services", authenticate, authorize(ROLES.ADMIN), validate(specialistServiceCreateSchema), asyncHandler(masterController.createSpecialistService));
router.patch("/specialist-services/:serviceId", authenticate, authorize(ROLES.ADMIN), validate(specialistServiceUpdateSchema), asyncHandler(masterController.updateSpecialistService));
router.delete("/specialist-services/:serviceId", authenticate, authorize(ROLES.ADMIN), validate(specialistServiceDeleteSchema), asyncHandler(masterController.deleteSpecialistService));

router.get("/specialist-services/:serviceId/plans", authenticate, authorize(ROLES.ADMIN), validate(servicePlansListSchema), asyncHandler(masterController.getServicePlans));
router.post("/specialist-services/:serviceId/plans", authenticate, authorize(ROLES.ADMIN), validate(servicePlanCreateSchema), asyncHandler(masterController.createServicePlan));
router.patch("/specialist-services/:serviceId/plans/:planId", authenticate, authorize(ROLES.ADMIN), validate(servicePlanUpdateSchema), asyncHandler(masterController.updateServicePlan));
router.delete("/specialist-services/:serviceId/plans/:planId", authenticate, authorize(ROLES.ADMIN), validate(servicePlanDeleteSchema), asyncHandler(masterController.deleteServicePlan));

export default router;

