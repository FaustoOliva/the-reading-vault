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

export class AIController {
  constructor(recommendBooksService) {
    this.recommendBooksService = recommendBooksService;
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
}
