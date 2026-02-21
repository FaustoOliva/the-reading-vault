/**
 * Author Routes
 * Defines HTTP routes for author-related operations
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
import { AuthorsController } from "../controllers/authorsController.js";
import { loggerMiddleware } from "../middlewares/loggerMiddleware.js";

export default function authorRoutes(getController) {
  const router = Router();
  router.use(loggerMiddleware);

  /**
   * GET /authors
   * Returns all authors sorted alphabetically with optional filtering
   * Query params: nameLike
   */
  router.get("/authors", (req, res, next) =>
    getController(AuthorsController).getAuthors(req, res, next),
  );

  return router;
}
