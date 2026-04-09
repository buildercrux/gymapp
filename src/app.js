import cors from "cors";
import express from "express";
import { existsSync } from "fs";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

const createApp = () => {
  const app = express();
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const frontendCandidates = [
    path.resolve(currentDir, "../public"),
    path.resolve(currentDir, "../public/dist"),
    path.resolve(currentDir, "../../frontend/dist"),
  ];
  const frontendDistDir =
    frontendCandidates.find((candidate) => existsSync(path.join(candidate, "index.html"))) || null;
  const frontendIndexPath = frontendDistDir ? path.join(frontendDistDir, "index.html") : "";
  const hasFrontendBuild = Boolean(frontendDistDir);

  app.use(helmet());
  app.use(cors({ origin: env.clientUrls, credentials: true }));
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ success: true, message: "Gym management API is healthy" });
  });

  app.get(["/favicon.ico", "/favicon.png"], (_req, res) => {
    res.status(204).end();
  });

  app.use("/api", routes);

  if (hasFrontendBuild) {
    app.use(express.static(frontendDistDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path === "/health" || path.extname(req.path)) {
        next();
        return;
      }

      res.sendFile(frontendIndexPath);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp();
