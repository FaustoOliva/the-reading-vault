/**
 * Reader Profile Integration Test Suite - MVP
 * End-to-end tests for profile refresh workflows
 *
 * Pattern: AAA (Arrange-Act-Assert)
 * Target Coverage: ≥ 80%
 * Phase: MVP (Schema Version 1)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { AIContextRepository } from "../infraestructure/repositories/aiContextRepository.js";
import { GetReaderProfileService } from "../services/getReaderProfileService.js";
import { OpenAIClient } from "../infraestructure/ai/openAIClient.js";

// Mock global fetch for OpenAI calls
global.fetch = vi.fn();

describe("Reader Profile Integration - MVP", () => {
  let aiContextRepository;
  let getReaderProfileService;
  let openAIClient;
  let mockPool;
  let mockRequest;
  let mockBookRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: vi.fn(),
      input: vi.fn().mockReturnThis(),
    };

    mockPool = {
      request: vi.fn().mockReturnValue(mockRequest),
    };

    mockBookRepository = {
      calculateGlobalKPIs: vi.fn(),
    };

    // Setup OpenAI client with mock fetch
    openAIClient = new OpenAIClient({
      apiKey: "sk-test-key",
      model: "gpt-3.5-turbo",
      temperature: 0.4,
      maxTokens: 300,
      timeout: 15000,
    });

    aiContextRepository = new AIContextRepository(mockPool, mockBookRepository);
    aiContextRepository.openAIClient = openAIClient;

    getReaderProfileService = new GetReaderProfileService(
      aiContextRepository,
      openAIClient,
    );
  });

  describe("Complete Book Workflow", () => {
    it("complete book → profile refreshes with incremented version", async () => {
      // Arrange
      const existingProfile = {
        id: 1,
        version: 3,
        schema_version: 1,
        profile_data: JSON.stringify({
          version: 3,
          schemaVersion: 1,
          statistics: { totalBooks: 10, completedBooks: 6 },
          topAuthors: [],
        }),
        semantic_summary: "Old summary",
        last_updated: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
        last_refresh_reason: "book_abandoned",
        tokens_used: 250,
      };

      // Mock getReaderProfile
      mockRequest.query.mockResolvedValueOnce({ recordset: [existingProfile] });

      // Mock calculateReaderProfile aggregations
      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 11,
        completedBooks: 7,
        booksInProgress: 2,
        abandonedBooks: 2,
        wishListBooks: 0,
        completionRate: 0.636,
        booksRated: 7,
        avgScore: 8.2,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] }) // topAuthors
        .mockResolvedValueOnce({ recordset: [] }) // topCountries
        .mockResolvedValueOnce({ recordset: [] }) // favoriteBooks
        .mockResolvedValueOnce({ recordset: [] }); // abandonedBooks

      // Mock OpenAI response
      global.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "Este lector ha completado 7 libros...",
              },
            },
          ],
          usage: { total_tokens: 287 },
        }),
      });

      // Mock saveReaderProfile
      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await getReaderProfileService.refreshIfNeeded({
        event: "book_completed",
        bookId: 123,
      });

      // Assert
      expect(result.refreshed).toBe(true);
      expect(result.reason).toBe("book_completed");
      expect(result.version).toBe(4); // Incremented from 3
      expect(mockRequest.input).toHaveBeenCalledWith(
        "version",
        expect.anything(),
        4,
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "last_refresh_reason",
        expect.anything(),
        "book_completed",
      );
    });
  });

  describe("Abandon Book Workflow", () => {
    it("abandon book → profile includes book in abandonedBooks array", async () => {
      // Arrange
      const existingProfile = {
        id: 1,
        version: 2,
        schema_version: 1,
        profile_data: JSON.stringify({
          version: 2,
          schemaVersion: 1,
          statistics: { totalBooks: 5, abandonedBooks: 1 },
        }),
        last_updated: new Date(),
      };

      mockRequest.query.mockResolvedValueOnce({ recordset: [existingProfile] });

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 5,
        completedBooks: 3,
        booksInProgress: 0,
        abandonedBooks: 2,
        wishListBooks: 0,
        completionRate: 0.6,
        booksRated: 3,
        avgScore: 7.5,
      });

      const abandonedBooks = [
        { title: "Ulysses", author: "James Joyce", nationality: "Ireland" },
        {
          title: "War and Peace",
          author: "Leo Tolstoy",
          nationality: "Russia",
        },
      ];

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] }) // topAuthors
        .mockResolvedValueOnce({ recordset: [] }) // topCountries
        .mockResolvedValueOnce({ recordset: [] }) // favoriteBooks
        .mockResolvedValueOnce({ recordset: abandonedBooks }); // abandonedBooks

      global.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Profile with abandoned books" } }],
          usage: { total_tokens: 240 },
        }),
      });

      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      // Act
      await getReaderProfileService.refreshIfNeeded({
        event: "book_abandoned",
        bookId: 456,
      });

      // Assert
      const saveCall = mockRequest.input.mock.calls.find(
        (call) => call[0] === "profile_data",
      );
      const savedProfile = JSON.parse(saveCall[2]);
      expect(savedProfile.abandonedBooks).toHaveLength(2);
      expect(savedProfile.abandonedBooks[0].title).toBe("Ulysses");
    });
  });

  describe("Top Authors Change Workflow", () => {
    it("complete book from new author → top authors recalculated (simple count)", async () => {
      // Arrange
      const existingProfile = {
        id: 1,
        version: 5,
        schema_version: 1,
        profile_data: JSON.stringify({
          version: 5,
          schemaVersion: 1,
          topAuthors: [
            { name: "Author A", bookCount: 5, avgScore: 8.0 },
            { name: "Author B", bookCount: 4, avgScore: 7.5 },
            { name: "Author C", bookCount: 3, avgScore: 8.5 },
          ],
        }),
        last_updated: new Date(),
      };

      mockRequest.query.mockResolvedValueOnce({ recordset: [existingProfile] });

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 13,
        completedBooks: 10,
        booksInProgress: 2,
        abandonedBooks: 1,
        wishListBooks: 0,
        completionRate: 0.769,
        booksRated: 10,
        avgScore: 8.1,
      });

      const newTopAuthors = [
        {
          name: "Author D",
          nationality: "Country D",
          bookCount: 6,
          avgScore: 9.0,
        },
        {
          name: "Author A",
          nationality: "Country A",
          bookCount: 5,
          avgScore: 8.0,
        },
        {
          name: "Author B",
          nationality: "Country B",
          bookCount: 4,
          avgScore: 7.5,
        },
      ];

      mockRequest.query
        .mockResolvedValueOnce({ recordset: newTopAuthors }) // topAuthors
        .mockResolvedValueOnce({ recordset: [] }) // topCountries
        .mockResolvedValueOnce({ recordset: [] }) // favoriteBooks
        .mockResolvedValueOnce({ recordset: [] }); // abandonedBooks

      global.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "New top author detected" } }],
          usage: { total_tokens: 260 },
        }),
      });

      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await getReaderProfileService.refreshIfNeeded({
        event: "book_status_changed",
        bookId: 789,
      });

      // Assert
      expect(result.refreshed).toBe(true);
      expect(result.reason).toBe("top_authors_changed");

      const saveCall = mockRequest.input.mock.calls.find(
        (call) => call[0] === "profile_data",
      );
      const savedProfile = JSON.parse(saveCall[2]);
      expect(savedProfile.topAuthors[0].name).toBe("Author D");
    });
  });

  describe("Reading Sessions (No Refresh)", () => {
    it("multiple sessions on same book → no refresh until completion", async () => {
      // Arrange
      const existingProfile = {
        id: 1,
        version: 3,
        schema_version: 1,
        profile_data: JSON.stringify({
          version: 3,
          schemaVersion: 1,
          statistics: { totalBooks: 10 },
        }),
        last_updated: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      };

      mockRequest.query.mockResolvedValue({ recordset: [existingProfile] });

      // Act - simulate 3 reading sessions
      await getReaderProfileService.refreshIfNeeded({
        event: "session_logged",
        bookId: 123,
      });

      await getReaderProfileService.refreshIfNeeded({
        event: "session_logged",
        bookId: 123,
      });

      await getReaderProfileService.refreshIfNeeded({
        event: "session_logged",
        bookId: 123,
      });

      // Assert - no refreshes occurred
      const profileCalls = mockRequest.query.mock.calls.filter((call) =>
        call[0]?.includes("SELECT id, version"),
      );
      expect(profileCalls).toHaveLength(3); // Only getReaderProfile calls, no saves
    });
  });

  describe("OpenAI Integration", () => {
    it("profile refresh generates semantic summary if OpenAI available", async () => {
      // Arrange
      mockRequest.query.mockResolvedValueOnce({ recordset: [] }); // No existing profile

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 5,
        completedBooks: 3,
        booksInProgress: 1,
        abandonedBooks: 1,
        wishListBooks: 0,
        completionRate: 0.6,
        booksRated: 3,
        avgScore: 8.0,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      global.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "Generated semantic summary with OpenAI",
              },
            },
          ],
          usage: { total_tokens: 295 },
        }),
      });

      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      // Act
      const result =
        await aiContextRepository.refreshReaderProfile("initial_seed");

      // Assert
      expect(result.semanticSummary).toBe(
        "Generated semantic summary with OpenAI",
      );
      expect(result.tokensUsed).toBe(295);
      expect(mockRequest.input).toHaveBeenCalledWith(
        "semantic_summary",
        expect.anything(),
        "Generated semantic summary with OpenAI",
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "tokens_used",
        expect.anything(),
        295,
      );
    });

    it("profile refresh succeeds even if OpenAI unavailable", async () => {
      // Arrange
      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 3,
        completedBooks: 2,
        booksInProgress: 1,
        abandonedBooks: 0,
        wishListBooks: 0,
        completionRate: 0.667,
        booksRated: 2,
        avgScore: 7.5,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      // Mock OpenAI failure
      global.fetch.mockRejectedValue(new Error("OpenAI unavailable"));

      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      // Act
      const result =
        await aiContextRepository.refreshReaderProfile("book_completed");

      // Assert
      expect(result.semanticSummary).toBeNull();
      expect(result.tokensUsed).toBe(0);
      expect(mockRequest.input).toHaveBeenCalledWith(
        "semantic_summary",
        expect.anything(),
        null,
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "tokens_used",
        expect.anything(),
        0,
      );
    });

    it("profile refresh tracks token usage correctly", async () => {
      // Arrange
      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 10,
        completedBooks: 7,
        booksInProgress: 2,
        abandonedBooks: 1,
        wishListBooks: 0,
        completionRate: 0.7,
        booksRated: 7,
        avgScore: 8.3,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      global.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Summary" } }],
          usage: { total_tokens: 314 },
        }),
      });

      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      // Act
      const result =
        await aiContextRepository.refreshReaderProfile("book_completed");

      // Assert
      expect(result.tokensUsed).toBe(314);
      expect(mockRequest.input).toHaveBeenCalledWith(
        "tokens_used",
        expect.anything(),
        314,
      );
    });

    it("profile refresh handles OpenAI rate limits gracefully", async () => {
      // Arrange
      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 5,
        completedBooks: 3,
        booksInProgress: 1,
        abandonedBooks: 1,
        wishListBooks: 0,
        completionRate: 0.6,
        booksRated: 3,
        avgScore: 7.8,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      // Mock rate limit response
      global.fetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValue({
          error: { message: "Rate limit exceeded" },
        }),
      });

      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      // Act
      const result =
        await aiContextRepository.refreshReaderProfile("book_abandoned");

      // Assert - profile saved without semantic summary
      expect(result.semanticSummary).toBeNull();
      expect(result.tokensUsed).toBe(0);
      expect(mockRequest.input).toHaveBeenCalledWith(
        "profile_data",
        expect.anything(),
        expect.any(String),
      );
    });
  });

  describe("Schema Version", () => {
    it("profile contains schemaVersion=1 for MVP", async () => {
      // Arrange
      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 1,
        completedBooks: 1,
        booksInProgress: 0,
        abandonedBooks: 0,
        wishListBooks: 0,
        completionRate: 1.0,
        booksRated: 1,
        avgScore: 9.0,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      global.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Summary" } }],
          usage: { total_tokens: 150 },
        }),
      });

      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      // Act
      await aiContextRepository.refreshReaderProfile("initial_seed");

      // Assert
      const saveCall = mockRequest.input.mock.calls.find(
        (call) => call[0] === "profile_data",
      );
      const savedProfile = JSON.parse(saveCall[2]);
      expect(savedProfile.schemaVersion).toBe(1);
    });
  });

  describe("Empty Vault", () => {
    it("should handle empty vault gracefully", async () => {
      // Arrange
      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 0,
        completedBooks: 0,
        booksInProgress: 0,
        abandonedBooks: 0,
        wishListBooks: 0,
        completionRate: 0,
        booksRated: 0,
        avgScore: null,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      global.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "Este lector aún no ha agregado libros a su bóveda.",
              },
            },
          ],
          usage: { total_tokens: 120 },
        }),
      });

      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      // Act
      const result =
        await aiContextRepository.refreshReaderProfile("initial_seed");

      // Assert
      expect(result.version).toBe(1);
      const profileData = JSON.parse(
        mockRequest.input.mock.calls.find(
          (call) => call[0] === "profile_data",
        )[2],
      );
      expect(profileData.statistics.totalBooks).toBe(0);
      expect(profileData.topAuthors).toEqual([]);
      expect(result.semanticSummary).toContain("bóveda");
    });
  });

  describe("Staleness Check", () => {
    it("should refresh profile if last update >24 hours ago", async () => {
      // Arrange
      const staleProfile = {
        id: 1,
        version: 2,
        schema_version: 1,
        profile_data: JSON.stringify({
          version: 2,
          schemaVersion: 1,
          statistics: { totalBooks: 5 },
        }),
        last_updated: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
      };

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [staleProfile] })
        .mockResolvedValueOnce({ recordset: [staleProfile] });

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 5,
        completedBooks: 3,
        booksInProgress: 1,
        abandonedBooks: 1,
        wishListBooks: 0,
        completionRate: 0.6,
        booksRated: 3,
        avgScore: 7.5,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      global.fetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Refreshed stale profile" } }],
          usage: { total_tokens: 200 },
        }),
      });

      mockRequest.query.mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await getReaderProfileService.execute();

      // Assert
      expect(result).toBeDefined();
      expect(mockRequest.input).toHaveBeenCalledWith(
        "last_refresh_reason",
        expect.anything(),
        "stale_profile",
      );
    });
  });
});
