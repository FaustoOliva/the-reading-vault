import { Application } from "express";
import healthController from "../controllers/healthController";

export default function registerRoutes(app: Application) {
  app.get("/health", healthController.getHealth);
}
