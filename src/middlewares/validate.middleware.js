import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";

export const validate =
  (schema) =>
  (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return next(
        new AppError("Validation failed", StatusCodes.BAD_REQUEST, result.error.flatten()),
      );
    }

    req.validated = result.data;
    next();
  };
