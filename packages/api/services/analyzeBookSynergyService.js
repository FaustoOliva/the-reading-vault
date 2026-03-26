/**
 * AnalyzeBookSynergyService (Query Use Case)
 * Analyzes how well a specific book fits the current reader profile.
 */

import {
  NotFoundError,
  ReaderProfileMinimumBooksError,
} from "../errors/index.js";

export class AnalyzeBookSynergyService {
  constructor(getReaderProfileService, openAIClient, bookRepository) {
    this.getReaderProfileService = getReaderProfileService;
    this.openAIClient = openAIClient;
    this.bookRepository = bookRepository;
  }

  /**
   * @param {number} bookId
   * @returns {Promise<{book:Object, compatibility:Object, tokensUsed:number, generatedAt:string, inputMode:string}>}
   */
  async execute(bookId) {
    const book = await this.bookRepository.getById(bookId);

    if (!book) {
      throw new NotFoundError("Book not found");
    }

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

    const result = await this.openAIClient.analyzeBookSynergy({
      profile: profileInput,
      book: book.toJSON(),
    });

    return {
      book: {
        id: book.id,
        title: book.title,
        author: {
          id: book.authorId,
          name: book.authorName,
        },
      },
      compatibility: result.compatibility,
      tokensUsed: result.tokensUsed,
      generatedAt: new Date().toISOString(),
      inputMode: profileInput.type,
    };
  }
}
