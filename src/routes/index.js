import { Router } from "express";
import authRoutes from "./auth.routes.js";
import exerciseRoutes from "./exercise.routes.js";
import gymRoutes from "./gym.routes.js";
import masterRoutes from "./master.routes.js";
import notificationRoutes from "./notification.routes.js";
import planRoutes from "./plan.routes.js";
import profileRoutes from "./profile.routes.js";
import checkinRoutes from "./checkin.routes.js";
import specialistRoutes from "./specialist.routes.js";
import workoutRoutes from "./workout.routes.js";
import couponRoutes from "./coupon.routes.js";
import transactionRoutes from "./transaction.routes.js";
import billingRoutes from "./billing.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/user/profile", profileRoutes);
router.use("/gym", gymRoutes);
router.use("/plans", planRoutes);
router.use("/coupons", couponRoutes);
router.use("/transactions", transactionRoutes);
router.use("/billing", billingRoutes);
router.use("/masters", masterRoutes);
router.use("/", workoutRoutes);
router.use("/exercises", exerciseRoutes);
router.use("/notifications", notificationRoutes);
router.use("/checkins", checkinRoutes);
router.use("/specialists", specialistRoutes);

export default router;
