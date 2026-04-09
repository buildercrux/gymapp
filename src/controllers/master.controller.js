import { StatusCodes } from "http-status-codes";
import * as masterService from "../services/master.service.js";

export const getEquipment = async (_req, res) => {
  const equipment = await masterService.listEquipment();
  res.status(StatusCodes.OK).json({ success: true, data: equipment });
};

export const createEquipment = async (req, res) => {
  const equipment = await masterService.createEquipment(req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: equipment });
};

export const updateEquipment = async (req, res) => {
  const equipment = await masterService.updateEquipment(req.validated.params.equipmentId, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: equipment });
};

export const deleteEquipment = async (req, res) => {
  const result = await masterService.deleteEquipment(req.validated.params.equipmentId);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const getWorkoutTypes = async (_req, res) => {
  const workoutTypes = await masterService.listWorkoutTypes();
  res.status(StatusCodes.OK).json({ success: true, data: workoutTypes });
};

export const createWorkoutType = async (req, res) => {
  const workoutType = await masterService.createWorkoutType(req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: workoutType });
};

export const updateWorkoutType = async (req, res) => {
  const workoutType = await masterService.updateWorkoutType(req.validated.params.workoutTypeId, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: workoutType });
};

export const deleteWorkoutType = async (req, res) => {
  const result = await masterService.deleteWorkoutType(req.validated.params.workoutTypeId);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const getExerciseMasters = async (_req, res) => {
  const exercises = await masterService.listExerciseMasters();
  res.status(StatusCodes.OK).json({ success: true, data: exercises });
};

export const createExerciseMaster = async (req, res) => {
  const exercise = await masterService.createExerciseMaster(req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: exercise });
};

export const updateExerciseMaster = async (req, res) => {
  const exercise = await masterService.updateExerciseMaster(req.validated.params.exerciseId, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: exercise });
};

export const deleteExerciseMaster = async (req, res) => {
  const result = await masterService.deleteExerciseMaster(req.validated.params.exerciseId);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const getSpecialistPricing = async (_req, res) => {
  const pricing = await masterService.getSpecialistPricing();
  res.status(StatusCodes.OK).json({ success: true, data: pricing });
};

export const setSpecialistPricing = async (req, res) => {
  const pricing = await masterService.setSpecialistPricing(req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: pricing });
};

export const getSpecialistServices = async (_req, res) => {
  const services = await masterService.listSpecialistServices();
  res.status(StatusCodes.OK).json({ success: true, data: services });
};

export const createSpecialistService = async (req, res) => {
  const service = await masterService.createSpecialistService(req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: service });
};

export const updateSpecialistService = async (req, res) => {
  const service = await masterService.updateSpecialistService(req.validated.params.serviceId, req.validated.body);
  res.status(StatusCodes.OK).json({ success: true, data: service });
};

export const deleteSpecialistService = async (req, res) => {
  const result = await masterService.deleteSpecialistService(req.validated.params.serviceId);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};

export const getServicePlans = async (req, res) => {
  const plans = await masterService.listServicePlans(req.validated.params.serviceId);
  res.status(StatusCodes.OK).json({ success: true, data: plans });
};

export const createServicePlan = async (req, res) => {
  const plan = await masterService.createServicePlan(req.validated.params.serviceId, req.validated.body);
  res.status(StatusCodes.CREATED).json({ success: true, data: plan });
};

export const updateServicePlan = async (req, res) => {
  const plan = await masterService.updateServicePlan(
    req.validated.params.serviceId,
    req.validated.params.planId,
    req.validated.body,
  );
  res.status(StatusCodes.OK).json({ success: true, data: plan });
};

export const deleteServicePlan = async (req, res) => {
  const result = await masterService.deleteServicePlan(req.validated.params.serviceId, req.validated.params.planId);
  res.status(StatusCodes.OK).json({ success: true, data: result });
};
