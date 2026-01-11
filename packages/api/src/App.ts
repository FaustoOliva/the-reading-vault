import express, { Application } from "express";
import cors from "cors";
import registerRoutes from "./interfaces/http/routes";
import { notFound } from "./interfaces/http/middlewares/notFound";
import { errorHandler } from "./interfaces/http/middlewares/errorHandler";

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Register routes
  registerRoutes(app);

  // 404
  app.use(notFound);

  // Global error handler
  app.use(errorHandler);

  return app;
}

export default createApp();
