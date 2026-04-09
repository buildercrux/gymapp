import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError.js";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { verifyAccessToken } from "../services/token.service.js";

export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED);
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = verifyAccessToken(token);

    const [user, session] = await Promise.all([
      User.findById(payload.sub).lean(),
      Session.findOne({ tokenId: payload.tokenId, user: payload.sub }).lean(),
    ]);

    if (!user || !session) {
      throw new AppError("Invalid session", StatusCodes.UNAUTHORIZED);
    }

    req.user = { id: user._id.toString(), role: user.role, phone: user.phone };
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("Forbidden", StatusCodes.FORBIDDEN));
    }

    next();
  };
