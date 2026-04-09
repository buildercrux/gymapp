import { StatusCodes } from "http-status-codes";
import * as planService from "../services/plan.service.js";

export const getPlans = async (req, res) => {
  const plans = await planService.getPlans(req.query.gymId);
  res.status(StatusCodes.OK).json({ success: true, data: plans });
};

export const createPlan = async (req, res) => {
  const plan = await planService.createPlan({
    actorId: req.user.id,
    actorRole: req.user.role,
    ...req.validated.body,
  });
  res.status(StatusCodes.CREATED).json({ success: true, data: plan });
};

export const updatePlan = async (req, res) => {
  const plan = await planService.updatePlan({
    actorId: req.user.id,
    actorRole: req.user.role,
    planId: req.validated.params.planId,
    ...req.validated.body,
  });
  res.status(StatusCodes.OK).json({ success: true, data: plan });
};

export const removePlan = async (req, res) => {
  const result = await planService.removePlan({
    actorId: req.user.id,
    actorRole: req.user.role,
    planId: req.validated.params.planId,
    gymId: req.validated.body.gymId,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const createBooking = async (req, res) => {
  const booking = await planService.createBooking(req.user.id, req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: booking });
};

export const getMyBookings = async (req, res) => {
  const bookings = await planService.getMyBookings(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: bookings });
};

export const getAllBookings = async (_req, res) => {
  const bookings = await planService.getAllBookingsAdmin();
  res.status(StatusCodes.OK).json({ success: true, data: bookings });
};
