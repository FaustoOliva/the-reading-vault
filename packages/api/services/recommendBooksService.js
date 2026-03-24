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
  constructor(getReaderProfileService, openAIClient, bookRepository = null) {
    this.getReaderProfileService = getReaderProfileService;
    this.openAIClient = openAIClient;
    this.bookRepository = bookRepository;
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

    // 4. Load deterministic exclusion set from vault
    const existingBookKeys = await this._loadExistingBookKeys();

    // 5. Generate recommendations via OpenAI
    const firstResult = await this.openAIClient.recommendBooks(promptInput);
    let totalTokens = firstResult.tokensUsed || 0;

    let recommendations = this._filterRecommendations(
      firstResult.recommendations,
      existingBookKeys,
    );

    // 6. Controlled retry once when filtering leaves too few valid books
    if (recommendations.length < 3) {
      const blacklist = this._extractExcludedFromBatch(
        firstResult.recommendations,
        existingBookKeys,
      );

      if (blacklist.length > 0) {
        const retryInput = {
          ...promptInput,
          excludeBooks: blacklist,
        };

        const retryResult = await this.openAIClient.recommendBooks(retryInput);
        totalTokens += retryResult.tokensUsed || 0;

        const retryRecommendations = this._filterRecommendations(
          retryResult.recommendations,
          existingBookKeys,
          new Set(
            recommendations.map((book) =>
              this._buildBookKey(book.title, book.author),
            ),
          ),
        );

        recommendations = [...recommendations, ...retryRecommendations];
      }
    }

    // 7. Return with metadata
    return {
      recommendations: recommendations.slice(0, 5),
      tokensUsed: totalTokens,
      generatedAt: new Date().toISOString(),
      inputMode: promptInput.type, // For debugging/analytics
    };
  }

  async _loadExistingBookKeys() {
    if (!this.bookRepository?.getRecommendationExclusionList) {
      return new Set();
    }

    const books = await this.bookRepository.getRecommendationExclusionList();
    return new Set(
      books.map((book) => this._buildBookKey(book.title, book.author)),
    );
  }

  _filterRecommendations(
    recommendations,
    existingBookKeys,
    seenKeys = new Set(),
  ) {
    if (!recommendations || recommendations.length === 0) {
      return [];
    }

    const filtered = [];

    for (const book of recommendations) {
      const key = this._buildBookKey(book.title, book.author);
      if (!key) {
        continue;
      }

      if (existingBookKeys.has(key) || seenKeys.has(key)) {
        continue;
      }

      seenKeys.add(key);
      filtered.push(book);
    }

    return filtered;
  }

  _extractExcludedFromBatch(recommendations, existingBookKeys) {
    if (!recommendations || recommendations.length === 0) {
      return [];
    }

    const excluded = [];
    const seen = new Set();

    for (const book of recommendations) {
      const key = this._buildBookKey(book.title, book.author);
      if (!key || !existingBookKeys.has(key) || seen.has(key)) {
        continue;
      }

      seen.add(key);
      excluded.push({
        title: book.title,
        author: book.author,
      });
    }

    return excluded;
  }

  _buildBookKey(title, author) {
    const normalizedTitle = this._normalizeBookText(title);
    const normalizedAuthor = this._normalizeBookText(author);

    if (!normalizedTitle || !normalizedAuthor) {
      return null;
    }

    return `${normalizedTitle}::${normalizedAuthor}`;
  }

  _normalizeBookText(text) {
    if (!text || typeof text !== "string") {
      return "";
    }

    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
