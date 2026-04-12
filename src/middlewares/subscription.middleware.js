import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";
import { getOwnerSubscriptionStatus } from "../services/billing.service.js";

export const requireActiveOwnerSubscription = async (req, _res, next) => {
  try {
    if (!req.user || req.user.role !== "owner") {
      return next();
    }

    const status = await getOwnerSubscriptionStatus(req.user.id);
    if (status.isInGoodStanding) {
      return next();
    }

    const subscriptionState = status.subscription?.status || "pending";
    const message =
      subscriptionState === "pending"
        ? "Subscription required. Please choose Pay now or Start trial."
        : "Your plan is expired. Recharge to access gym management.";

    return next(
      new AppError(message, StatusCodes.PAYMENT_REQUIRED, {
        subscriptionStatus: subscriptionState,
        dueAt: status.dueAt,
        remainingDays: status.remainingDays,
        plan: status.subscription?.plan || null,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

