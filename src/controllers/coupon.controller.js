import { StatusCodes } from "http-status-codes";
import * as couponService from "../services/coupon.service.js";
import * as planService from "../services/plan.service.js";

export const listCoupons = async (req, res) => {
  const coupons = await couponService.listCoupons({
    actorId: req.user.id,
    actorRole: req.user.role,
    gymId: req.validated.query.gymId,
    planId: req.validated.query.planId,
    includeInactive: req.validated.query.includeInactive,
  });
  res.status(StatusCodes.OK).json({ success: true, data: coupons });
};

export const createCoupon = async (req, res) => {
  const coupon = await couponService.createCoupon({
    actorId: req.user.id,
    actorRole: req.user.role,
    ...req.validated.body,
  });
  res.status(StatusCodes.CREATED).json({ success: true, data: coupon });
};

export const updateCoupon = async (req, res) => {
  const coupon = await couponService.updateCoupon({
    actorId: req.user.id,
    actorRole: req.user.role,
    couponId: req.validated.params.couponId,
    ...req.validated.body,
  });
  res.status(StatusCodes.OK).json({ success: true, data: coupon });
};

export const disableCoupon = async (req, res) => {
  const result = await couponService.disableCoupon({
    actorId: req.user.id,
    actorRole: req.user.role,
    couponId: req.validated.params.couponId,
    gymId: req.validated.body.gymId,
  });
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const validateCoupon = async (req, res) => {
  const result = await planService.validateCouponCode(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};
