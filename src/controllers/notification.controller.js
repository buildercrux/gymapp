import { StatusCodes } from "http-status-codes";
import * as notificationService from "../services/notification.service.js";

export const getNotifications = async (req, res) => {
  const notifications = await notificationService.getNotifications(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: notifications });
};

export const readNotifications = async (req, res) => {
  const notifications = await notificationService.markNotificationsRead(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: notifications });
};
