import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientUrls,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || "";
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const payload = jwt.verify(token, env.jwtSecret);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  return io;
};

export const getIo = () => io;

export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) {
    return;
  }

  io.to(`user:${userId}`).emit(event, payload);
};

