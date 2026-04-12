import { Router } from "express";
import { ROLES } from "../constants/roles.js";
import * as billingController from "../controllers/billing.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  adminCouponIdSchema,
  adminCreateCouponSchema,
  adminCreatePlanSchema,
  adminPlanIdSchema,
  adminUpdateSettingsSchema,
  adminUpdateCouponSchema,
  adminUpdatePlanSchema,
  payNowSchema,
  previewPaymentSchema,
  startTrialSchema,
} from "../validators/billing.validator.js";

const router = Router();

router.get("/plans", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), asyncHandler(billingController.listPlans));
router.get("/status", authenticate, authorize(ROLES.OWNER), asyncHandler(billingController.getStatus));
router.post("/start-trial", authenticate, authorize(ROLES.OWNER), validate(startTrialSchema), asyncHandler(billingController.startTrial));
router.post("/preview", authenticate, authorize(ROLES.OWNER), validate(previewPaymentSchema), asyncHandler(billingController.previewPayment));
router.post("/pay", authenticate, authorize(ROLES.OWNER), validate(payNowSchema), asyncHandler(billingController.payNow));

router.get("/admin/plans", authenticate, authorize(ROLES.ADMIN), asyncHandler(billingController.adminListPlans));
router.get("/admin/settings", authenticate, authorize(ROLES.ADMIN), asyncHandler(billingController.adminGetSettings));
router.put("/admin/settings", authenticate, authorize(ROLES.ADMIN), validate(adminUpdateSettingsSchema), asyncHandler(billingController.adminUpdateSettings));
router.post("/admin/plans", authenticate, authorize(ROLES.ADMIN), validate(adminCreatePlanSchema), asyncHandler(billingController.adminCreatePlan));
router.put("/admin/plans/:planId", authenticate, authorize(ROLES.ADMIN), validate(adminUpdatePlanSchema), asyncHandler(billingController.adminUpdatePlan));
router.delete("/admin/plans/:planId", authenticate, authorize(ROLES.ADMIN), validate(adminPlanIdSchema), asyncHandler(billingController.adminDeletePlan));

router.get("/admin/coupons", authenticate, authorize(ROLES.ADMIN), asyncHandler(billingController.adminListCoupons));
router.post("/admin/coupons", authenticate, authorize(ROLES.ADMIN), validate(adminCreateCouponSchema), asyncHandler(billingController.adminCreateCoupon));
router.put("/admin/coupons/:couponId", authenticate, authorize(ROLES.ADMIN), validate(adminUpdateCouponSchema), asyncHandler(billingController.adminUpdateCoupon));
router.delete("/admin/coupons/:couponId", authenticate, authorize(ROLES.ADMIN), validate(adminCouponIdSchema), asyncHandler(billingController.adminDeleteCoupon));

export default router;
