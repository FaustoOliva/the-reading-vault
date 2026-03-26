/**
 * AIController
 * Handles HTTP requests for AI-powered features
 *
 * Responsibilities:
 * - Call AI services (recommendBooks)
 * - Format HTTP responses
 * - Forward errors to global middleware
 *
 * Rules:
 * - No business logic
 * - No validation needed (no user input for MVP)
 * - No domain error creation
 *
 * Phase: MVP (5.1 - AI Recommendations)
 */

import { z } from "zod";

const aiFavoriteAuthorsBodySchema = z
  .object({
    topAuthorsLimit: z.coerce.number().int().min(1).max(5).default(3),
  })
  .strict();

export class AIController {
  constructor(
    recommendBooksService,
    analyzeBookSynergyService,
    analyzeAuthorSynergyService,
    recommendBooksByFavoriteAuthorsService,
  ) {
    this.recommendBooksService = recommendBooksService;
    this.analyzeBookSynergyService = analyzeBookSynergyService;
    this.analyzeAuthorSynergyService = analyzeAuthorSynergyService;
    this.recommendBooksByFavoriteAuthorsService =
      recommendBooksByFavoriteAuthorsService;
  }

  /**
   * POST /api/ai/recommendations
   * Generate book recommendations based on reader profile
   *
   * Request: No body needed
   * Response: { success: true, data: { recommendations: [...], tokensUsed, generatedAt, inputMode } }
   *
   * Errors:
   * - 400: EmptyVaultError, InsufficientDataError
   * - 429: OpenAIRateLimitError
   * - 503: OpenAIUnavailableError, OpenAITimeoutError
   */
  async recommendBooks(req, res, next) {
    try {
      const result = await this.recommendBooksService.execute();

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/recommendations/by-favorite-authors
   */
  async recommendBooksByFavoriteAuthors(req, res, next) {
    try {
      const { topAuthorsLimit } = aiFavoriteAuthorsBodySchema.parse(req.body);

      const result = await this.recommendBooksByFavoriteAuthorsService.execute({
        topAuthorsLimit,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/ai/book/:id/synergy
   */
  async analyzeBookSynergy(req, res, next) {
    try {
      const bookId = z.coerce.number().int().positive().parse(req.params.id);
      const result = await this.analyzeBookSynergyService.execute(bookId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/ai/author/:id/synergy
   */
  async analyzeAuthorSynergy(req, res, next) {
    try {
      const authorId = z.coerce.number().int().positive().parse(req.params.id);
      const result = await this.analyzeAuthorSynergyService.execute(authorId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
