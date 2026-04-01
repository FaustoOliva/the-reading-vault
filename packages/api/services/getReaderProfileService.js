/**
 * GetReaderProfileService (Query Use Case)
 * Manages reader profile lifecycle for startup and AI recommendations.
 *
 * Rules implemented:
 * - Profile can exist only when COMPLETED + ABANDONED books >= 5
 * - Startup creates profile only when missing and eligible
 * - Important events only mark profile as pending refresh (no auto-refresh)
 * - Recommendations refresh only when profile is stale (>24h) and an important event is pending
 */

import {
  OpenAIUnavailableError,
  OpenAITimeoutError,
  OpenAIRateLimitError,
} from "../errors/index.js";

export class GetReaderProfileService {
  static MIN_BOOKS_FOR_PROFILE = 5;

  constructor(aiContextRepository, openAIClient) {
    this.aiContextRepository = aiContextRepository;
    this.openAIClient = openAIClient;
  }

  /**
   * Execute GetReaderProfile use case.
   * @param {Object} options
   * @param {boolean} options.createIfEligible - Creates profile when missing and requirement is met
   * @param {boolean} options.refreshForRecommendations - Applies stale+event refresh rule
   * @returns {Promise<Object|null>} Current reader profile or null when unavailable
   */
  async execute(options = {}) {
    const { createIfEligible = false, refreshForRecommendations = false } =
      options;

    let profile = await this.aiContextRepository.getReaderProfile();

    if (!profile && createIfEligible) {
      const currentBooks =
        await this.aiContextRepository.countBooksForProfileRequirement();

      if (currentBooks >= GetReaderProfileService.MIN_BOOKS_FOR_PROFILE) {
        const refreshResult = await this._performRefresh("initial_profile");
        profile = {
          id: 1,
          version: refreshResult.version,
          schemaVersion: 1,
          profileData: refreshResult.profileData,
          semanticSummary: refreshResult.semanticSummary,
          lastUpdated: new Date(),
          lastRefreshReason: "initial_profile",
          tokensUsed: refreshResult.tokensUsed,
          importantEventPending: false,
        };
      }
    }

    if (profile && refreshForRecommendations) {
      const shouldRefresh =
        this._isProfileStale(profile) && profile.importantEventPending;

      if (shouldRefresh) {
        const refreshResult = await this._performRefresh(
          "recommendations_sync",
        );
        profile = {
          ...profile,
          version: refreshResult.version,
          profileData: refreshResult.profileData,
          semanticSummary: refreshResult.semanticSummary,
          tokensUsed: refreshResult.tokensUsed,
          lastUpdated: new Date(),
          lastRefreshReason: "recommendations_sync",
          importantEventPending: false,
        };
      }
    }

    return profile;
  }

  /**
   * Returns minimum requirement state for profile availability.
   * @returns {Promise<{current:number, required:number, eligible:boolean}>}
   */
  async getMinimumRequirementStatus() {
    const current =
      await this.aiContextRepository.countBooksForProfileRequirement();
    return {
      current,
      required: GetReaderProfileService.MIN_BOOKS_FOR_PROFILE,
      eligible: current >= GetReaderProfileService.MIN_BOOKS_FOR_PROFILE,
    };
  }

  /**
   * Register an important event for future recommendation refresh checks.
   * This does not trigger an immediate profile refresh.
   * @returns {Promise<void>}
   */
  async markImportantEventPending() {
    try {
      await this.aiContextRepository.markImportantEventPending();
    } catch (error) {
      // Important-event marking is non-critical.
      console.warn("⚠️ Failed to mark important profile event:", error.message);
    }
  }

  /**
   * Backward-compatible API: no automatic refresh anymore.
   * Important events are only marked for future recommendation-time refresh.
   * @param {Object} context
   * @param {string} context.event
   * @returns {Promise<{refreshed: boolean, marked?: boolean}>}
   */
  async refreshIfNeeded(context) {
    const { event } = context;
    const importantEvents = {
      book_completed: true,
      book_abandoned: true,
    };

    if (!importantEvents[event]) {
      return { refreshed: false, marked: false };
    }

    await this.markImportantEventPending();
    return { refreshed: false, marked: true };
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
   * Check if profile is stale (>24 hours old)
   * @private
   * @param {Object|null} profile - Current profile
   * @returns {boolean} True if stale or missing
   */
  _isProfileStale(profile) {
    if (!profile) return true;

    const lastUpdatedValue = profile.lastUpdated || profile.last_updated;
    if (!lastUpdatedValue) return true;

    const lastUpdated = new Date(lastUpdatedValue);
    const now = new Date();
    const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);

    return hoursSinceUpdate > 24;
  }
}
