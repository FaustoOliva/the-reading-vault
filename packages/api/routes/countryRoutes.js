/**
 * Country Routes
 * Defines HTTP routes for country-related operations
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
import { CountriesController } from "../controllers/countriesController.js";
import { loggerMiddleware } from "../middlewares/loggerMiddleware.js";

export default function countryRoutes(getController) {
  const router = Router();
  router.use(loggerMiddleware);

  /**
   * GET /countries
   * Returns all countries sorted alphabetically with optional filtering
   * Query params: nameLike
   */
  router.get("/countries", (req, res, next) =>
    getController(CountriesController).getCountries(req, res, next)
  );

  return router;
}
