/**
 * AnalyzeAuthorSynergyService (Query Use Case)
 * Analyzes how well a specific author fits the current reader profile.
 */

import {
  NotFoundError,
  ReaderProfileMinimumBooksError,
} from "../errors/index.js";

export class AnalyzeAuthorSynergyService {
  constructor(
    getReaderProfileService,
    openAIClient,
    authorRepository,
    bookRepository,
  ) {
    this.getReaderProfileService = getReaderProfileService;
    this.openAIClient = openAIClient;
    this.authorRepository = authorRepository;
    this.bookRepository = bookRepository;
  }

  /**
   * @param {number} authorId
   * @returns {Promise<{author:Object, compatibility:Object, tokensUsed:number, generatedAt:string, inputMode:string}>}
   */
  async execute(authorId) {
    const author = await this.authorRepository.getById(authorId);

    if (!author) {
      throw new NotFoundError("Author not found");
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

    const booksByAuthor =
      await this.bookRepository.getBooksByAuthorId(authorId);

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

    const result = await this.openAIClient.analyzeAuthorSynergy({
      profile: profileInput,
      author,
      booksByAuthor,
    });

    return {
      author: {
        id: author.id,
        name: author.name,
        nationality: author.nationality || null,
      },
      compatibility: result.compatibility,
      tokensUsed: result.tokensUsed,
      generatedAt: new Date().toISOString(),
      inputMode: profileInput.type,
    };
  }
}
