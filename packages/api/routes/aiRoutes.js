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
  router.post("/recommendations", (req, res, next) =>
    getController(AIController).recommendBooks(req, res, next),
  );

  return router;
}
