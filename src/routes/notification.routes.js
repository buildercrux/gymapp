import { Router } from "express";
import * as notificationController from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", authenticate, asyncHandler(notificationController.getNotifications));
router.put("/read", authenticate, asyncHandler(notificationController.readNotifications));

export default router;
