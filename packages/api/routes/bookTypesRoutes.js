/**
 * BookTypes Routes
 * Defines HTTP routes for book types operations
 *
 * Responsibilities:
 * - Declare HTTP routes
 * - Bind routes to controller methods
 * - Apply route-level middlewares
 *
 * Rules:
 * - No business logic
 * - No validation
 * - No error handling
 */

import { Router } from "express";
import { BookTypesController } from "../controllers/bookTypesController.js";
import { loggerMiddleware } from "../middlewares/loggerMiddleware.js";

export default function bookTypesRoutes(getController) {
  const router = Router();
  router.use(loggerMiddleware);

  /**
   * GET /book-types
   * Returns all predefined book types sorted alphabetically
   */
  router.get("/book-types", (req, res, next) =>
    getController(BookTypesController).getBookTypes(req, res, next),
  );

  return router;
}
