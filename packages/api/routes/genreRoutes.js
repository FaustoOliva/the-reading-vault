/**
 * Genre Routes
 * Defines HTTP routes for genre-related operations
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
import { GenresController } from "../controllers/genresController.js";
import { loggerMiddleware } from "../middlewares/loggerMiddleware.js";

export default function genreRoutes(getController) {
  const router = Router();
  router.use(loggerMiddleware);

  /**
   * GET /genres
   * Returns all existing genres sorted alphabetically
   */
  router.get("/genres", (req, res, next) =>
    getController(GenresController).getGenres(req, res, next),
  );

  return router;
}
