import { Application } from "express";
import healthController from "../controllers/healthController";
import booksController from "../controllers/booksController";

export default function registerRoutes(app: Application) {
  app.get("/health", healthController.getHealth);
  app.get("/books", booksController.getAll);
}
