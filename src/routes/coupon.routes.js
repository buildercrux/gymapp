import { Router } from "express";
import * as couponController from "../controllers/coupon.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { requireActiveOwnerSubscription } from "../middlewares/subscription.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { couponIdSchema, createCouponSchema, listCouponsSchema, updateCouponSchema, validateCouponSchema } from "../validators/coupon.validator.js";

const router = Router();

router.post("/validate", authenticate, validate(validateCouponSchema), asyncHandler(couponController.validateCoupon));
router.get("/", authenticate, authorize("owner", "admin"), requireActiveOwnerSubscription, validate(listCouponsSchema), asyncHandler(couponController.listCoupons));
router.post(
  "/create",
  authenticate,
  authorize("owner", "admin"),
  requireActiveOwnerSubscription,
  validate(createCouponSchema),
  asyncHandler(couponController.createCoupon),
);
router.put(
  "/:couponId",
  authenticate,
  authorize("owner", "admin"),
  requireActiveOwnerSubscription,
  validate(updateCouponSchema),
  asyncHandler(couponController.updateCoupon),
);
router.delete(
  "/:couponId",
  authenticate,
  authorize("owner", "admin"),
  requireActiveOwnerSubscription,
  validate(couponIdSchema),
  asyncHandler(couponController.disableCoupon),
);

export default router;
