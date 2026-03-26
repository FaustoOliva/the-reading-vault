/**
 * AI Routes
 * Defines HTTP routes for AI-powered features
 *
 * Responsibilities:
 * - Declare HTTP routes for AI recommendations
 * - Bind routes to AIController methods
 * - Apply route-level middlewares
 *
 * Rules:
 * - No business logic
 * - No validation
 * - No error handling
 *
 * Phase: MVP (5.1 - AI Recommendations)
 */

import { Router } from "express";
import { AIController } from "../controllers/aiController.js";
import { loggerMiddleware } from "../middlewares/loggerMiddleware.js";

export default function aiRoutes(getController) {
  const router = Router();
  router.use(loggerMiddleware);

  /**
   * POST /ai/recommendations
   * Generate AI-powered book recommendations
   *
   * Request: No body needed
   * Response: { success: true, data: { recommendations: [...], tokensUsed, generatedAt } }
   *
   * Errors:
   * - 400: EmptyVaultError, InsufficientDataError
   * - 429: OpenAIRateLimitError
   * - 503: OpenAIUnavailableError, OpenAITimeoutError
   */
  router.post("/ai/recommendations", (req, res, next) =>
    getController(AIController).recommendBooks(req, res, next),
  );

  /**
   * POST /ai/recommendations/by-favorite-authors
   * Generate recommendations constrained to authors already read by the user
   */
  router.post("/ai/recommendations/by-favorite-authors", (req, res, next) =>
    getController(AIController).recommendBooksByFavoriteAuthors(req, res, next),
  );

  /**
   * GET /ai/book/:id/synergy
   * Analyze compatibility for a specific book
   */
  router.get("/ai/book/:id/synergy", (req, res, next) =>
    getController(AIController).analyzeBookSynergy(req, res, next),
  );

  /**
   * GET /ai/author/:id/synergy
   * Analyze compatibility for a specific author
   */
  router.get("/ai/author/:id/synergy", (req, res, next) =>
    getController(AIController).analyzeAuthorSynergy(req, res, next),
  );

  return router;
}
