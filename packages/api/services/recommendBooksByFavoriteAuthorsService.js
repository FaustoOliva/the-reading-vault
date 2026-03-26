/**
 * RecommendBooksByFavoriteAuthorsService (Query Use Case)
 * Generates recommendations by authors already present in the reader's history.
 */

import { ReaderProfileMinimumBooksError } from "../errors/index.js";

export class RecommendBooksByFavoriteAuthorsService {
  constructor(
    getReaderProfileService,
    openAIClient,
    aiContextRepository,
    bookRepository,
  ) {
    this.getReaderProfileService = getReaderProfileService;
    this.openAIClient = openAIClient;
    this.aiContextRepository = aiContextRepository;
    this.bookRepository = bookRepository;
  }

  /**
   * @param {{topAuthorsLimit?:number}} options
   * @returns {Promise<{recommendations:Array,tokensUsed:number,generatedAt:string,inputMode:string}>}
   */
  async execute(options = {}) {
    const topAuthorsLimit = options.topAuthorsLimit || 3;

    const profile = await this.getReaderProfileService.execute({
      createIfEligible: true,
      refreshForRecommendations: true,
    });

    if (!profile?.profileData) {
      const requirement =
        await this.getReaderProfileService.getMinimumRequirementStatus();
      throw new ReaderProfileMinimumBooksError(
        requirement.current,
        requirement.required,
      );
    }

    const minBooks =
      (profile.profileData.statistics?.completedBooks || 0) +
      (profile.profileData.statistics?.abandonedBooks || 0);

    if (minBooks < 5) {
      throw new ReaderProfileMinimumBooksError(minBooks, 5);
    }

    const topAuthors =
      await this.aiContextRepository.getTopAuthorsFromProfile(topAuthorsLimit);

    const excludedBooks =
      await this.bookRepository.getRecommendationExclusionList();

    const profileInput = profile.semanticSummary
      ? {
          type: "semantic",
          summary: profile.semanticSummary,
          data: profile.profileData,
        }
      : {
          type: "structured",
          data: profile.profileData,
        };

    const result = await this.openAIClient.recommendBooksByFavoriteAuthors({
      profile: profileInput,
      topAuthors,
      excludedBooks,
      strictAuthorNames: topAuthors.map((author) => author.name),
    });

    const allowedAuthors = new Set(
      topAuthors.map((author) => this._normalizeText(author.name)),
    );
    const excludedBookKeys = new Set(
      excludedBooks
        .map((book) => this._buildBookKey(book.title, book.author))
        .filter(Boolean),
    );

    let filteredRecommendations = this._filterAllowedRecommendations(
      result.recommendations,
      allowedAuthors,
      excludedBookKeys,
    );

    let tokensUsed = result.tokensUsed || 0;

    if (filteredRecommendations.length < 3) {
      const retryExcludedBooks = [
        ...excludedBooks,
        ...result.recommendations
          .filter(
            (book) => !allowedAuthors.has(this._normalizeText(book.author)),
          )
          .map((book) => ({
            title: book.title,
            author: book.author,
          })),
      ];

      const retryResult =
        await this.openAIClient.recommendBooksByFavoriteAuthors({
          profile: profileInput,
          topAuthors,
          excludedBooks: retryExcludedBooks,
          strictAuthorNames: topAuthors.map((author) => author.name),
        });

      tokensUsed += retryResult.tokensUsed || 0;

      const retryFiltered = this._filterAllowedRecommendations(
        retryResult.recommendations,
        allowedAuthors,
        excludedBookKeys,
        new Set(
          filteredRecommendations
            .map((book) => this._buildBookKey(book.title, book.author))
            .filter(Boolean),
        ),
      );

      filteredRecommendations = [...filteredRecommendations, ...retryFiltered];
    }

    return {
      recommendations: filteredRecommendations.slice(0, 5),
      tokensUsed,
      generatedAt: new Date().toISOString(),
      inputMode: profileInput.type,
    };
  }

  _filterAllowedRecommendations(
    recommendations,
    allowedAuthors,
    excludedBookKeys,
    seenKeys = new Set(),
  ) {
    if (!recommendations || recommendations.length === 0) {
      return [];
    }

    const filtered = [];

    for (const recommendation of recommendations) {
      const normalizedAuthor = this._normalizeText(recommendation.author);

      if (!allowedAuthors.has(normalizedAuthor)) {
        continue;
      }

      const key = this._buildBookKey(
        recommendation.title,
        recommendation.author,
      );

      if (!key || excludedBookKeys.has(key) || seenKeys.has(key)) {
        continue;
      }

      seenKeys.add(key);
      filtered.push(recommendation);
    }

    return filtered;
  }

  _buildBookKey(title, author) {
    const normalizedTitle = this._normalizeText(title);
    const normalizedAuthor = this._normalizeText(author);

    if (!normalizedTitle || !normalizedAuthor) {
      return null;
    }

    return `${normalizedTitle}::${normalizedAuthor}`;
  }

  _normalizeText(text) {
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
