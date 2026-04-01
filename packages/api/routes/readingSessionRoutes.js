/**
 * Reading Session Routes
 * Defines HTTP routes for reading session operations
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
import { ReadingSessionsController } from "../controllers/readingSessionsController.js";
import { loggerMiddleware } from "../middlewares/loggerMiddleware.js";

export default function readingSessionRoutes(getController) {
  const router = Router();
  router.use(loggerMiddleware);

  /**
   * GET /reading-sessions/recent
   * Gets the most recent reading session with book information
   */
  router.get("/reading-sessions/recent", (req, res, next) =>
    getController(ReadingSessionsController).getRecent(req, res, next),
  );

  /**
   * POST /reading-sessions
   * Logs a new reading session for a book
   * Body: { bookId, pagesRead, occurredAt? }
   */
  router.post("/reading-sessions", (req, res, next) =>
    getController(ReadingSessionsController).logSession(req, res, next),
  );

  return router;
}
