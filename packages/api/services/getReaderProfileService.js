/**
 * GetReaderProfileService (Query Use Case)
 * Retrieves reader profile with intelligent refresh logic
 *
 * Responsibilities:
 * - Return current reader profile for AI services
 * - Automatically refresh if profile is missing or stale (>24h)
 * - Provide refresh hook for other services after critical events
 * - Call OpenAI for semantic summary generation with error handling
 *
 * Rules:
 * - Framework-agnostic
 * - No validation needed (internal service)
 * - Graceful degradation: OpenAI failures don't block profile save
 * - Non-transactional (AIContextRepository handles persistence)
 * - Profile refresh failures MUST NOT fail parent operations
 *
 * Phase: MVP (Phase 1)
 * - Simple refresh triggers: book_completed, book_abandoned, top_authors_changed
 * - Staleness check: >24 hours
 */

import {
  OpenAIUnavailableError,
  OpenAITimeoutError,
  OpenAIRateLimitError,
} from "../errors/index.js";

export class GetReaderProfileService {
  constructor(aiContextRepository, openAIClient) {
    this.aiContextRepository = aiContextRepository;
    this.openAIClient = openAIClient;
  }

  /**
   * Execute GetReaderProfile use case
   * Returns current profile, auto-refreshes if missing or stale
   * @returns {Promise<Object>} Current reader profile
   */
  async execute() {
    const profile = await this.aiContextRepository.getReaderProfile();

    // Auto-refresh if profile missing or stale
    if (!profile || this._isProfileStale(profile)) {
      const reason = !profile ? "initial_profile" : "stale_profile";
      console.log(`📊 Auto-refreshing reader profile (${reason})...`);

      try {
        const refreshResult = await this._performRefresh(reason);
        return {
          ...profile,
          version: refreshResult.version,
          profileData: refreshResult.profileData,
          semanticSummary: refreshResult.semanticSummary,
          tokensUsed: refreshResult.tokensUsed,
        };
      } catch (error) {
        console.warn("⚠️ Profile refresh failed:", error.message);
        // Return existing profile if refresh fails
        return profile;
      }
    }

    return profile;
  }

  /**
   * Refresh profile if semantically relevant event occurred
   * Called by other services (reviewBookService, reopenBookService, etc.)
   * @param {Object} context - { event, bookId?, previousProfile? }
   * @returns {Promise<{refreshed: boolean, reason?: string, version?: number}>}
   */
  async refreshIfNeeded(context) {
    const { event, bookId } = context;

    try {
      // Get current profile
      const currentProfile = await this.aiContextRepository.getReaderProfile();

      // Determine if refresh needed
      const decision = this._shouldRefreshProfile({
        event,
        currentProfile,
      });

      if (!decision.shouldRefresh) {
        return { refreshed: false };
      }

      // Special case: check if top authors actually changed
      if (event === "book_status_changed") {
        // Calculate new profile temporarily to check top authors
        const newProfileData =
          await this.aiContextRepository.calculateReaderProfile();

        const topAuthorsChanged =
          this.aiContextRepository.detectTopAuthorsChange(
            currentProfile?.profileData || null,
            newProfileData,
          );

        if (!topAuthorsChanged) {
          return { refreshed: false };
        }

        decision.reason = "top_authors_changed";
      }

      // Perform refresh
      console.log(
        `📊 Refreshing reader profile (${decision.reason})${bookId ? ` for book ${bookId}` : ""}...`,
      );
      const result = await this._performRefresh(decision.reason);

      return {
        refreshed: true,
        reason: decision.reason,
        version: result.version,
      };
    } catch (error) {
      // Profile refresh failures MUST NOT fail parent operations
      console.warn("⚠️ Profile refresh failed:", error.message);
      return { refreshed: false, error: error.message };
    }
  }

  /**
   * Perform actual profile refresh with OpenAI summary generation
   * @private
   * @param {string} reason - Reason for refresh
   * @returns {Promise<{version: number, profileData: Object, semanticSummary: string|null, tokensUsed: number|null}>}
   */
  async _performRefresh(reason) {
    // Generate semantic summary with OpenAI
    let semanticSummary = null;
    let tokensUsed = null;

    // First calculate profile data (needed for OpenAI prompt)
    const profileData = await this.aiContextRepository.calculateReaderProfile();

    try {
      const summaryResult =
        await this.openAIClient.generateProfileSummary(profileData);
      semanticSummary = summaryResult.summary;
      tokensUsed = summaryResult.tokensUsed;

      console.log(
        `✅ OpenAI summary generated (${tokensUsed} tokens, ~$${((tokensUsed / 1000) * 0.002).toFixed(4)} USD)`,
      );
    } catch (error) {
      // Graceful degradation: OpenAI failures don't block profile save
      if (
        error instanceof OpenAIUnavailableError ||
        error instanceof OpenAITimeoutError ||
        error instanceof OpenAIRateLimitError
      ) {
        console.warn(
          `⚠️ OpenAI unavailable (${error.code}): Saving profile without semantic summary`,
        );
      } else {
        console.error("❌ Unexpected OpenAI error:", error);
      }
      // Continue with null semantic summary
    }

    // Save profile with incremented version
    const result = await this.aiContextRepository.refreshReaderProfile(
      reason,
      semanticSummary,
      tokensUsed,
    );

    return result;
  }

  /**
   * Determine if profile refresh is needed based on event
   * @private
   * @param {Object} params - { event, currentProfile }
   * @returns {Object} { shouldRefresh: boolean, reason?: string }
   */
  _shouldRefreshProfile({ event, currentProfile }) {
    // Always refresh on these critical events
    const criticalEvents = {
      book_completed: true,
      book_abandoned: true,
    };

    if (criticalEvents[event]) {
      return { shouldRefresh: true, reason: event };
    }

    // Check if status change might affect top authors
    if (event === "book_status_changed") {
      return { shouldRefresh: true, reason: "check_top_authors" };
    }

    // Check staleness
    if (this._isProfileStale(currentProfile)) {
      return { shouldRefresh: true, reason: "stale_profile" };
    }

    return { shouldRefresh: false };
  }

  /**
   * Check if profile is stale (>24 hours old)
   * @private
   * @param {Object|null} profile - Current profile
   * @returns {boolean} True if stale or missing
   */
  _isProfileStale(profile) {
    if (!profile) return true;

    const lastUpdated = new Date(profile.lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);

    return hoursSinceUpdate > 24;
  }
}
