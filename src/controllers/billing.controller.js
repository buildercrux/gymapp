import { StatusCodes } from "http-status-codes";
import * as billingService from "../services/billing.service.js";

export const listPlans = async (_req, res) => {
  const plans = await billingService.listOwnerBillingPlansForOwner();
  res.status(StatusCodes.OK).json({ success: true, data: plans });
};

export const getStatus = async (req, res) => {
  const status = await billingService.getOwnerSubscriptionStatus(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, data: status });
};

export const startTrial = async (req, res) => {
  const status = await billingService.startOwnerTrial(req.user.id, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: status });
};

export const payNow = async (req, res) => {
  const status = await billingService.payOwnerSubscription(req.user.id, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: status });
};

export const previewPayment = async (req, res) => {
  const preview = await billingService.previewOwnerPayment(req.user.id, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: preview });
};

export const adminListPlans = async (_req, res) => {
  const plans = await billingService.listOwnerBillingPlansForAdmin();
  res.status(StatusCodes.OK).json({ success: true, data: plans });
};

export const adminGetSettings = async (_req, res) => {
  const settings = await billingService.getOwnerBillingSettings();
  res.status(StatusCodes.OK).json({ success: true, data: settings });
};

export const adminUpdateSettings = async (req, res) => {
  const settings = await billingService.updateOwnerBillingSettings(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: settings });
};

export const adminCreatePlan = async (req, res) => {
  const plan = await billingService.createOwnerBillingPlan(req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: plan });
};

export const adminUpdatePlan = async (req, res) => {
  const plan = await billingService.updateOwnerBillingPlan(req.validated.params.planId, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: plan });
};

export const adminDeletePlan = async (req, res) => {
  const result = await billingService.deleteOwnerBillingPlan(req.validated.params.planId);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const adminListCoupons = async (_req, res) => {
  const coupons = await billingService.listOwnerBillingCouponsForAdmin();
  res.status(StatusCodes.OK).json({ success: true, data: coupons });
};

export const adminCreateCoupon = async (req, res) => {
  const coupon = await billingService.createOwnerBillingCoupon(req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: coupon });
};

export const adminUpdateCoupon = async (req, res) => {
  const coupon = await billingService.updateOwnerBillingCoupon(req.validated.params.couponId, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: coupon });
};

export const adminDeleteCoupon = async (req, res) => {
  const result = await billingService.deleteOwnerBillingCoupon(req.validated.params.couponId);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};
