import { describe, it, expect, beforeEach, vi } from "vitest";
import { RecommendBooksByFavoriteAuthorsService } from "../services/recommendBooksByFavoriteAuthorsService.js";
import { ReaderProfileMinimumBooksError } from "../errors/index.js";

describe("RecommendBooksByFavoriteAuthorsService", () => {
  let service;
  let mockGetReaderProfileService;
  let mockOpenAIClient;
  let mockAIContextRepository;
  let mockBookRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetReaderProfileService = {
      execute: vi.fn(),
      getMinimumRequirementStatus: vi.fn(),
    };

    mockOpenAIClient = {
      recommendBooksByFavoriteAuthors: vi.fn(),
    };

    mockAIContextRepository = {
      getTopAuthorsFromProfile: vi.fn(),
    };

    mockBookRepository = {
      getRecommendationExclusionList: vi.fn(),
    };

    service = new RecommendBooksByFavoriteAuthorsService(
      mockGetReaderProfileService,
      mockOpenAIClient,
      mockAIContextRepository,
      mockBookRepository,
    );
  });

  it("should generate recommendations using favorite authors", async () => {
    mockGetReaderProfileService.execute.mockResolvedValue({
      profileData: {
        statistics: {
          completedBooks: 7,
          abandonedBooks: 1,
        },
      },
      semanticSummary: "Reader profile summary",
    });

    mockAIContextRepository.getTopAuthorsFromProfile.mockResolvedValue([
      { name: "Author One", bookCount: 3, avgScore: 8.5 },
      { name: "Author Two", bookCount: 2, avgScore: 8.2 },
    ]);

    mockBookRepository.getRecommendationExclusionList.mockResolvedValue([
      { title: "Already Read", author: "Author One" },
    ]);

    mockOpenAIClient.recommendBooksByFavoriteAuthors.mockResolvedValue({
      recommendations: [
        {
          title: "Unread Book",
          author: "Author One",
          synopsis: "A new recommendation",
          compatibilityScore: 86,
          reasoning: "High affinity with favorite author",
        },
        {
          title: "Unread Book 2",
          author: "Author Two",
          synopsis: "Another recommendation",
          compatibilityScore: 83,
          reasoning: "High affinity with favorite author",
        },
        {
          title: "Unread Book 3",
          author: "Author One",
          synopsis: "Third recommendation",
          compatibilityScore: 81,
          reasoning: "High affinity with favorite author",
        },
      ],
      tokensUsed: 330,
    });

    const result = await service.execute({ topAuthorsLimit: 2 });

    expect(result.recommendations).toHaveLength(3);
    expect(result.tokensUsed).toBe(330);
    expect(result.inputMode).toBe("semantic");
    expect(
      mockAIContextRepository.getTopAuthorsFromProfile,
    ).toHaveBeenCalledWith(2);
  });

  it("should filter out recommendations from non-favorite authors", async () => {
    mockGetReaderProfileService.execute.mockResolvedValue({
      profileData: {
        statistics: {
          completedBooks: 7,
          abandonedBooks: 1,
        },
      },
      semanticSummary: "Reader profile summary",
    });

    mockAIContextRepository.getTopAuthorsFromProfile.mockResolvedValue([
      { name: "Author One", bookCount: 3, avgScore: 8.5 },
      { name: "Author Two", bookCount: 2, avgScore: 8.2 },
    ]);

    mockBookRepository.getRecommendationExclusionList.mockResolvedValue([]);

    mockOpenAIClient.recommendBooksByFavoriteAuthors
      .mockResolvedValueOnce({
        recommendations: [
          {
            title: "Allowed Book 1",
            author: "Author One",
            synopsis: "A new recommendation",
            compatibilityScore: 86,
            reasoning: "High affinity",
          },
          {
            title: "Not Allowed",
            author: "External Author",
            synopsis: "Out of scope author",
            compatibilityScore: 72,
            reasoning: "Should be filtered",
          },
        ],
        tokensUsed: 200,
      })
      .mockResolvedValueOnce({
        recommendations: [
          {
            title: "Allowed Book 2",
            author: "Author Two",
            synopsis: "A second recommendation",
            compatibilityScore: 81,
            reasoning: "High affinity",
          },
          {
            title: "Allowed Book 3",
            author: "Author One",
            synopsis: "A third recommendation",
            compatibilityScore: 79,
            reasoning: "High affinity",
          },
        ],
        tokensUsed: 150,
      });

    const result = await service.execute({ topAuthorsLimit: 2 });

    expect(result.recommendations).toHaveLength(3);
    expect(
      result.recommendations.every((book) =>
        ["Author One", "Author Two"].includes(book.author),
      ),
    ).toBe(true);
    expect(result.tokensUsed).toBe(350);
    expect(
      mockOpenAIClient.recommendBooksByFavoriteAuthors,
    ).toHaveBeenCalledTimes(2);
  });

  it("should pass strict author names to OpenAI client", async () => {
    mockGetReaderProfileService.execute.mockResolvedValue({
      profileData: {
        statistics: {
          completedBooks: 7,
          abandonedBooks: 1,
        },
      },
      semanticSummary: "Reader profile summary",
    });

    mockAIContextRepository.getTopAuthorsFromProfile.mockResolvedValue([
      { name: "Author One", bookCount: 3, avgScore: 8.5 },
      { name: "Author Two", bookCount: 2, avgScore: 8.2 },
      { name: "Author Three", bookCount: 2, avgScore: 7.9 },
    ]);

    mockBookRepository.getRecommendationExclusionList.mockResolvedValue([]);

    mockOpenAIClient.recommendBooksByFavoriteAuthors.mockResolvedValue({
      recommendations: [
        {
          title: "Allowed Book",
          author: "Author One",
          synopsis: "A recommendation",
          compatibilityScore: 86,
          reasoning: "High affinity",
        },
      ],
      tokensUsed: 180,
    });

    await service.execute({ topAuthorsLimit: 3 });

    expect(
      mockOpenAIClient.recommendBooksByFavoriteAuthors,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        strictAuthorNames: ["Author One", "Author Two", "Author Three"],
      }),
    );
  });

  it("should throw ReaderProfileMinimumBooksError when profile is unavailable", async () => {
    mockGetReaderProfileService.execute.mockResolvedValue(null);
    mockGetReaderProfileService.getMinimumRequirementStatus.mockResolvedValue({
      current: 4,
      required: 5,
      eligible: false,
    });

    await expect(service.execute()).rejects.toThrow(
      ReaderProfileMinimumBooksError,
    );
  });

  it("should throw ReaderProfileMinimumBooksError when threshold is not met", async () => {
    mockGetReaderProfileService.execute.mockResolvedValue({
      profileData: {
        statistics: {
          completedBooks: 3,
          abandonedBooks: 1,
        },
      },
      semanticSummary: "partial profile",
    });

    await expect(service.execute()).rejects.toThrow(
      ReaderProfileMinimumBooksError,
    );
  });
});
