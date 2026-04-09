import { Router } from "express";
import * as specialistController from "../controllers/specialist.controller.js";
import { ROLES } from "../constants/roles.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  specialistAdminRequestsSchema,
  specialistAdminStatusSchema,
  specialistMyRequestsSchema,
  specialistRequestCreateSchema,
  specialistServicesListSchema,
} from "../validators/specialist.validator.js";

const router = Router();

router.get("/services", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), validate(specialistServicesListSchema), asyncHandler(specialistController.getServicesWithPlans));
router.post("/requests", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), validate(specialistRequestCreateSchema), asyncHandler(specialistController.createServiceRequest));
router.get("/requests/my", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), validate(specialistMyRequestsSchema), asyncHandler(specialistController.getMyRequests));

router.get("/admin/requests", authenticate, authorize(ROLES.ADMIN), validate(specialistAdminRequestsSchema), asyncHandler(specialistController.getAdminRequests));
router.patch("/admin/requests/:requestId/status", authenticate, authorize(ROLES.ADMIN), validate(specialistAdminStatusSchema), asyncHandler(specialistController.setAdminRequestStatus));

export default router;

