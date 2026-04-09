import { StatusCodes } from "http-status-codes";
import * as specialistService from "../services/specialist.service.js";

export const getServicesWithPlans = async (_req, res) => {
  const services = await specialistService.listServicesWithPlans();
  res.status(StatusCodes.OK).json({ success: true, data: services });
};

export const createServiceRequest = async (req, res) => {
  const request = await specialistService.createRequest(req.user.id, req.user.role, req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: request });
};

export const getMyRequests = async (req, res) => {
  const requests = await specialistService.listOwnerRequests(req.user.id, req.user.role, req.validated.query?.gymId);
  res.status(StatusCodes.OK).json({ success: true, data: requests });
};

export const getAdminRequests = async (req, res) => {
  const requests = await specialistService.listServiceRequestsAdmin(req.validated.query?.serviceId);
  res.status(StatusCodes.OK).json({ success: true, data: requests });
};

export const setAdminRequestStatus = async (req, res) => {
  const request = await specialistService.setRequestStatusAdmin(req.validated.params.requestId, req.validated.body.status);
  res.status(StatusCodes.OK).json({ success: true, data: request });
};

