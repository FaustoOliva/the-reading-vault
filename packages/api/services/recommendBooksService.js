/**
 * RecommendBooksService (Query Use Case)
 * Generates AI-powered book recommendations based on reader profile
 *
 * Responsibilities:
 * - Fetch current reader profile via GetReaderProfileService
 * - Validate profile readiness (min 3 completed/reading books)
 * - Extract semantic_summary (primary) or profile_data (fallback)
 * - Call OpenAIClient.recommendBooks()
 * - Return recommendations with metadata
 *
 * Rules:
 * - Framework-agnostic service
 * - No validation needed (internal service)
 * - Uses semantic_summary as primary input for efficiency
 * - Falls back to structured data if summary is null
 * - Requires minimum 3 books (completed or reading) to generate
 * - Non-transactional (read-only operation)
 *
 * Phase: MVP (5.1 - AI Recommendations)
 */

import { ReaderProfileMinimumBooksError } from "../errors/index.js";

export class RecommendBooksService {
  constructor(getReaderProfileService, openAIClient) {
    this.getReaderProfileService = getReaderProfileService;
    this.openAIClient = openAIClient;
  }

  /**
   * Execute RecommendBooks use case
   * @returns {Promise<{recommendations: Array, tokensUsed: number, generatedAt: string, inputMode: string}>}
   * @throws {EmptyVaultError} - No profile exists
   * @throws {InsufficientDataError} - Less than 3 books in vault
   * @throws {OpenAIUnavailableError} - OpenAI service down
   * @throws {OpenAIRateLimitError} - Rate limit exceeded
   * @throws {OpenAITimeoutError} - Request timeout
   */
  async execute() {
    // 1. Fetch profile and create it on demand when the minimum requirement is met
    const profile = await this.getReaderProfileService.execute({
      createIfEligible: true,
      refreshForRecommendations: true,
    });

    // 2. Validate profile readiness
    if (!profile || !profile.profileData) {
      const requirement =
        await this.getReaderProfileService.getMinimumRequirementStatus();
      throw new ReaderProfileMinimumBooksError(
        requirement.current,
        requirement.required,
      );
    }

    const stats = profile.profileData.statistics;
    const minBooks = (stats.completedBooks || 0) + (stats.abandonedBooks || 0);

    if (minBooks < 5) {
      throw new ReaderProfileMinimumBooksError(minBooks, 5);
    }

    // 3. Prepare input for OpenAI (semantic-first approach)
    let promptInput;

    if (profile.semanticSummary) {
      // ✅ Primary path: Use pre-generated semantic summary
      promptInput = {
        type: "semantic",
        summary: profile.semanticSummary,
        abandonedBooks: profile.profileData.abandonedBooks || [], // Anti-recommendation signal
      };
      console.log(
        "📊 Using semantic summary for recommendations (efficient mode)",
      );
    } else {
      // ⚠️ Fallback: Reconstruct from structured data
      promptInput = {
        type: "structured",
        data: profile.profileData,
      };
      console.warn(
        "⚠️ Semantic summary unavailable, using structured data fallback",
      );
    }

    // 4. Generate recommendations via OpenAI
    const result = await this.openAIClient.recommendBooks(promptInput);

    // 5. Return with metadata
    return {
      recommendations: result.recommendations,
      tokensUsed: result.tokensUsed,
      generatedAt: new Date().toISOString(),
      inputMode: promptInput.type, // For debugging/analytics
    };
  }
}
