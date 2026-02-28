/**
 * RecommendBooksService Test Suite
 * Tests for AI-powered book recommendations
 *
 * Pattern: AAA (Arrange-Act-Assert)
 * Target Coverage: ≥ 80%
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { RecommendBooksService } from "../services/recommendBooksService.js";
import { EmptyVaultError, InsufficientDataError } from "../errors/index.js";

describe("RecommendBooksService", () => {
  let service;
  let mockGetReaderProfileService;
  let mockOpenAIClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetReaderProfileService = {
      execute: vi.fn(),
    };

    mockOpenAIClient = {
      recommendBooks: vi.fn(),
    };

    service = new RecommendBooksService(
      mockGetReaderProfileService,
      mockOpenAIClient,
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
            readingBooks: 1,
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

    it("should throw EmptyVaultError when profile does not exist", async () => {
      // Arrange
      mockGetReaderProfileService.execute.mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute()).rejects.toThrow(EmptyVaultError);
      await expect(service.execute()).rejects.toThrow(
        "Cannot generate recommendations without books in your vault",
      );
      expect(mockOpenAIClient.recommendBooks).not.toHaveBeenCalled();
    });

    it("should throw EmptyVaultError when profileData is missing", async () => {
      // Arrange
      const emptyProfile = {
        id: 1,
        version: 1,
        profileData: null,
        semanticSummary: null,
      };

      mockGetReaderProfileService.execute.mockResolvedValue(emptyProfile);

      // Act & Assert
      await expect(service.execute()).rejects.toThrow(EmptyVaultError);
      expect(mockOpenAIClient.recommendBooks).not.toHaveBeenCalled();
    });

    it("should throw InsufficientDataError when less than 3 books total", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 2,
        profileData: {
          statistics: {
            completedBooks: 1,
            readingBooks: 1,
            totalBooks: 2,
          },
        },
        semanticSummary: "Not enough data yet",
      };

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);

      // Act & Assert
      await expect(service.execute()).rejects.toThrow(InsufficientDataError);
      await expect(service.execute()).rejects.toThrow(
        "Need at least 3 books to generate recommendations (you have 2)",
      );
      expect(mockOpenAIClient.recommendBooks).not.toHaveBeenCalled();
    });

    it("should throw InsufficientDataError with only completed books (no reading)", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 2,
        profileData: {
          statistics: {
            completedBooks: 2,
            readingBooks: 0,
            totalBooks: 5,
          },
        },
        semanticSummary: "Test",
      };

      mockGetReaderProfileService.execute.mockResolvedValue(mockProfile);

      // Act & Assert
      await expect(service.execute()).rejects.toThrow(InsufficientDataError);
      const error = await service.execute().catch((e) => e);
      expect(error.current).toBe(2);
      expect(error.required).toBe(3);
    });

    it("should accept exactly 3 books as minimum threshold", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 3,
        profileData: {
          statistics: {
            completedBooks: 2,
            readingBooks: 1,
            totalBooks: 3,
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
  });
});
