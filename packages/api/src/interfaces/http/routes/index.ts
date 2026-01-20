import { Application } from "express";
import healthController from "../controllers/healthController";
import booksController from "../controllers/booksController";
import sessionsController from "../controllers/sessionsController";
import { Router } from "express";

export default function registerRoutes(app: Application) {
  const apiRouter = Router();
  
  app.use("/api", apiRouter);

  apiRouter.get("/health", healthController.getHealth);
  apiRouter.get("/books", booksController.getAll);
  apiRouter.post("/books", booksController.createBook);
  apiRouter.get("/books/:id", booksController.getById);
  apiRouter.post("/sessions", sessionsController.create);


}
