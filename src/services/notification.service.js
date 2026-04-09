import { Notification } from "../models/Notification.js";

export const getNotifications = async (userId) =>
  Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(25).lean();

export const markNotificationsRead = async (userId) => {
  await Notification.updateMany({ user: userId, readAt: null }, { $set: { readAt: new Date() } });
  return getNotifications(userId);
};
