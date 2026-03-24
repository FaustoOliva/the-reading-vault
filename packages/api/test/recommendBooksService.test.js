/**
 * RecommendBooksService Test Suite
 * Tests for AI-powered book recommendations
 *
 * Pattern: AAA (Arrange-Act-Assert)
 * Target Coverage: ≥ 80%
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { RecommendBooksService } from "../services/recommendBooksService.js";
import { ReaderProfileMinimumBooksError } from "../errors/index.js";

describe("RecommendBooksService", () => {
  let service;
  let mockGetReaderProfileService;
  let mockOpenAIClient;
  let mockBookRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetReaderProfileService = {
      execute: vi.fn(),
      getMinimumRequirementStatus: vi.fn(),
    };

    mockOpenAIClient = {
      recommendBooks: vi.fn(),
    };

    mockBookRepository = {
      getRecommendationExclusionList: vi.fn().mockResolvedValue([]),
    };

    service = new RecommendBooksService(
      mockGetReaderProfileService,
      mockOpenAIClient,
      mockBookRepository,
    );
  });

  describe("execute", () => {
    it("should generate recommendations using semantic summary (primary path)", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 5,
        profileData: {
          statistics: {
            completedBooks: 5,
            readingBooks: 2,
            totalBooks: 10,
            avgScore: 8.5,
          },
          topAuthors: [
            { name: "Author One", bookCount: 3 },
            { name: "Author Two", bookCount: 2 },
          ],
          abandonedBooks: [{ title: "Bad Book", author: "Bad Author" }],
        },
        semanticSummary:
          "This reader enjoys literary fiction with strong character development...",
      };

      const mockRecommendations = {
        recommendations: [
          {
            title: "The Great Novel",
            author: "Famous Author",
            synopsis: "A compelling story about...",
            compatibilityScore: 87,
            reasoning:
              "Matches your preference for character-driven narratives",
          },
          {
            title: "Another Book",
            author: "Another Author",
            synopsis: "An exploration of...",
            compatibilityScore: 82,
            reasoning: "Similar themes to your top-rated books",
          },
        ],
        tokensUsed: 350,
      };

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);
      mockOpenAIClient.recommendBooks.mockResolvedValue(mockRecommendations);

      // Act
      const result = await service.execute();

      // Assert
      expect(mockGetReaderProfileService.execute).toHaveBeenCalledTimes(1);
      expect(mockGetReaderProfileService.execute).toHaveBeenCalledWith({
        createIfEligible: true,
        refreshForRecommendations: true,
      });
      expect(mockOpenAIClient.recommendBooks).toHaveBeenCalledWith({
        type: "semantic",
        summary: mockProfile.semanticSummary,
        abandonedBooks: mockProfile.profileData.abandonedBooks,
      });
      expect(result.recommendations).toEqual(
        mockRecommendations.recommendations,
      );
      expect(result.tokensUsed).toBe(350);
      expect(result.inputMode).toBe("semantic");
      expect(result.generatedAt).toBeDefined();
      expect(new Date(result.generatedAt)).toBeInstanceOf(Date);
    });

    it("should fallback to structured data when semantic summary is null", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 3,
        profileData: {
          statistics: {
            completedBooks: 4,
            abandonedBooks: 1,
            totalBooks: 8,
            avgScore: 7.8,
          },
          topAuthors: [{ name: "Test Author", bookCount: 2 }],
          favoriteBooks: [
            { title: "Test Book", author: "Test Author", score: 9 },
          ],
        },
        semanticSummary: null, // OpenAI was unavailable during profile generation
      };

      const mockRecommendations = {
        recommendations: [
          {
            title: "Structured Book",
            author: "Structured Author",
            synopsis: "Generated from structured data",
            compatibilityScore: 75,
            reasoning: "Based on your reading statistics",
          },
        ],
        tokensUsed: 450,
      };

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);
      mockOpenAIClient.recommendBooks.mockResolvedValue(mockRecommendations);

      // Act
      const result = await service.execute();

      // Assert
      expect(mockOpenAIClient.recommendBooks).toHaveBeenCalledWith({
        type: "structured",
        data: mockProfile.profileData,
      });
      expect(result.inputMode).toBe("structured");
      expect(result.recommendations).toEqual(
        mockRecommendations.recommendations,
      );
    });

    it("should throw ReaderProfileMinimumBooksError when profile does not exist", async () => {
      // Arrange
      mockGetReaderProfileService.execute.mockResolvedValue(null);
      mockGetReaderProfileService.getMinimumRequirementStatus.mockResolvedValue(
        {
          current: 2,
          required: 5,
          eligible: false,
        },
      );

      // Act & Assert
      await expect(service.execute()).rejects.toThrow(
        ReaderProfileMinimumBooksError,
      );
      await expect(service.execute()).rejects.toThrow(
        "Reader profile is not available yet. You need at least 5 completed or abandoned books (you have 2)",
      );
      expect(mockOpenAIClient.recommendBooks).not.toHaveBeenCalled();
    });

    it("should throw ReaderProfileMinimumBooksError when profileData is missing", async () => {
      // Arrange
      const emptyProfile = {
        id: 1,
        version: 1,
        profileData: null,
        semanticSummary: null,
      };

      mockGetReaderProfileService.execute.mockResolvedValue(emptyProfile);
      mockGetReaderProfileService.getMinimumRequirementStatus.mockResolvedValue(
        {
          current: 4,
          required: 5,
          eligible: false,
        },
      );

      // Act & Assert
      await expect(service.execute()).rejects.toThrow(
        ReaderProfileMinimumBooksError,
      );
      expect(mockOpenAIClient.recommendBooks).not.toHaveBeenCalled();
    });

    it("should throw ReaderProfileMinimumBooksError when less than 5 completed+abandoned books", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 2,
        profileData: {
          statistics: {
            completedBooks: 2,
            abandonedBooks: 1,
            totalBooks: 2,
          },
        },
        semanticSummary: "Not enough data yet",
      };

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);

      // Act & Assert
      await expect(service.execute()).rejects.toThrow(
        ReaderProfileMinimumBooksError,
      );
      await expect(service.execute()).rejects.toThrow(
        "Reader profile is not available yet. You need at least 5 completed or abandoned books (you have 3)",
      );
      expect(mockOpenAIClient.recommendBooks).not.toHaveBeenCalled();
    });

    it("should throw ReaderProfileMinimumBooksError when minimum rule is not met", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 2,
        profileData: {
          statistics: {
            completedBooks: 4,
            abandonedBooks: 0,
            totalBooks: 5,
          },
        },
        semanticSummary: "Test",
      };

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);

      // Act & Assert
      await expect(service.execute()).rejects.toThrow(
        ReaderProfileMinimumBooksError,
      );
      const error = await service.execute().catch((e) => e);
      expect(error.current).toBe(4);
      expect(error.required).toBe(5);
    });

    it("should accept exactly 5 books as minimum threshold", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 3,
        profileData: {
          statistics: {
            completedBooks: 3,
            abandonedBooks: 2,
            totalBooks: 5,
          },
        },
        semanticSummary: "Minimal profile",
      };

      const mockRecommendations = {
        recommendations: [
          {
            title: "Minimal Book",
            author: "Minimal Author",
            synopsis: "For minimal data",
            compatibilityScore: 70,
            reasoning: "Limited data available",
          },
        ],
        tokensUsed: 200,
      };

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);
      mockOpenAIClient.recommendBooks.mockResolvedValue(mockRecommendations);

      // Act
      const result = await service.execute();

      // Assert
      expect(mockOpenAIClient.recommendBooks).toHaveBeenCalled();
      expect(result.recommendations).toBeDefined();
    });

    it("should handle OpenAI errors gracefully (pass-through)", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 4,
        profileData: {
          statistics: {
            completedBooks: 5,
            readingBooks: 2,
          },
        },
        semanticSummary: "Test summary",
      };

      const openAIError = new Error("OpenAI API unavailable");
      openAIError.name = "OpenAIUnavailableError";

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);
      mockOpenAIClient.recommendBooks.mockRejectedValue(openAIError);

      // Act & Assert
      await expect(service.execute()).rejects.toThrow("OpenAI API unavailable");
    });

    it("should include abandonedBooks in semantic mode input", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 5,
        profileData: {
          statistics: {
            completedBooks: 10,
            readingBooks: 3,
          },
          abandonedBooks: [
            { title: "Boring Book", author: "Boring Author" },
            { title: "Bad Book", author: "Bad Author" },
          ],
        },
        semanticSummary: "Reader profile with abandoned books",
      };

      const mockRecommendations = {
        recommendations: [],
        tokensUsed: 300,
      };

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);
      mockOpenAIClient.recommendBooks.mockResolvedValue(mockRecommendations);

      // Act
      await service.execute();

      // Assert
      expect(mockOpenAIClient.recommendBooks).toHaveBeenCalledWith(
        expect.objectContaining({
          abandonedBooks: mockProfile.profileData.abandonedBooks,
        }),
      );
    });

    it("should handle missing abandonedBooks array gracefully", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 5,
        profileData: {
          statistics: {
            completedBooks: 8,
            readingBooks: 2,
          },
          // No abandonedBooks array
        },
        semanticSummary: "Profile without abandoned books",
      };

      const mockRecommendations = {
        recommendations: [],
        tokensUsed: 250,
      };

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);
      mockOpenAIClient.recommendBooks.mockResolvedValue(mockRecommendations);

      // Act
      await service.execute();

      // Assert
      expect(mockOpenAIClient.recommendBooks).toHaveBeenCalledWith(
        expect.objectContaining({
          abandonedBooks: [],
        }),
      );
    });

    it("should deterministically filter recommendations already in vault", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 5,
        profileData: {
          statistics: {
            completedBooks: 8,
            abandonedBooks: 2,
          },
          abandonedBooks: [],
        },
        semanticSummary: "Profile summary",
      };

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);
      mockBookRepository.getRecommendationExclusionList.mockResolvedValue([
        { title: "1984", author: "George Orwell" },
      ]);
      mockOpenAIClient.recommendBooks.mockResolvedValue({
        recommendations: [
          {
            title: "1984",
            author: "George Orwell",
            synopsis: "Already read",
            compatibilityScore: 90,
            reasoning: "Duplicate",
          },
          {
            title: "Fresh Book",
            author: "Fresh Author",
            synopsis: "New",
            compatibilityScore: 82,
            reasoning: "Fits profile",
          },
          {
            title: "Fresh Book Two",
            author: "Fresh Author Two",
            synopsis: "New",
            compatibilityScore: 81,
            reasoning: "Fits profile",
          },
          {
            title: "Fresh Book Three",
            author: "Fresh Author Three",
            synopsis: "New",
            compatibilityScore: 80,
            reasoning: "Fits profile",
          },
        ],
        tokensUsed: 220,
      });

      // Act
      const result = await service.execute();

      // Assert
      expect(result.recommendations).toHaveLength(3);
      expect(result.recommendations[0].title).toBe("Fresh Book");
      expect(result.tokensUsed).toBe(220);
      expect(mockOpenAIClient.recommendBooks).toHaveBeenCalledTimes(1);
    });

    it("should retry once with blacklist when filtering leaves too few recommendations", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 5,
        profileData: {
          statistics: {
            completedBooks: 8,
            abandonedBooks: 2,
          },
          abandonedBooks: [],
        },
        semanticSummary: "Profile summary",
      };

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);
      mockBookRepository.getRecommendationExclusionList.mockResolvedValue([
        { title: "1984", author: "George Orwell" },
        { title: "Animal Farm", author: "George Orwell" },
      ]);

      mockOpenAIClient.recommendBooks
        .mockResolvedValueOnce({
          recommendations: [
            {
              title: "1984",
              author: "George Orwell",
              synopsis: "Dup",
              compatibilityScore: 91,
              reasoning: "Dup",
            },
            {
              title: "Animal Farm",
              author: "George Orwell",
              synopsis: "Dup",
              compatibilityScore: 87,
              reasoning: "Dup",
            },
          ],
          tokensUsed: 200,
        })
        .mockResolvedValueOnce({
          recommendations: [
            {
              title: "Book A",
              author: "Author A",
              synopsis: "A",
              compatibilityScore: 80,
              reasoning: "A",
            },
            {
              title: "Book B",
              author: "Author B",
              synopsis: "B",
              compatibilityScore: 81,
              reasoning: "B",
            },
            {
              title: "Book C",
              author: "Author C",
              synopsis: "C",
              compatibilityScore: 82,
              reasoning: "C",
            },
          ],
          tokensUsed: 180,
        });

      // Act
      const result = await service.execute();

      // Assert
      expect(mockOpenAIClient.recommendBooks).toHaveBeenCalledTimes(2);
      expect(mockOpenAIClient.recommendBooks).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          excludeBooks: [
            { title: "1984", author: "George Orwell" },
            { title: "Animal Farm", author: "George Orwell" },
          ],
        }),
      );
      expect(result.recommendations).toHaveLength(3);
      expect(result.tokensUsed).toBe(380);
    });
  });
});
