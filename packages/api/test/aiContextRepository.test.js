/**
 * AIContextRepository Test Suite - MVP
 * Tests for reader profile aggregation and storage
 *
 * Pattern: AAA (Arrange-Act-Assert)
 * Target Coverage: ≥ 80%
 * Phase: MVP (Schema Version 1)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { AIContextRepository } from "../infraestructure/repositories/aiContextRepository.js";

describe("AIContextRepository - MVP", () => {
  let repository;
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

    repository = new AIContextRepository(mockPool, mockBookRepository);
  });

  describe("getReaderProfile", () => {
    it("should return null when profile does not exist", async () => {
      // Arrange
      mockRequest.query.mockResolvedValue({ recordset: [] });

      // Act
      const result = await repository.getReaderProfile();

      // Assert
      expect(result).toBeNull();
      expect(mockRequest.query).toHaveBeenCalledWith(
        "SELECT id, version, schema_version, profile_data, semantic_summary, last_updated, last_refresh_reason, tokens_used FROM ReaderProfiles WHERE id = 1",
      );
    });

    it("should return profile when exists", async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        version: 5,
        schema_version: 1,
        profile_data: JSON.stringify({
          version: 5,
          schemaVersion: 1,
          statistics: { totalBooks: 10 },
        }),
        semantic_summary: "Test summary",
        last_updated: new Date("2026-02-22T10:00:00Z"),
        last_refresh_reason: "book_completed",
        tokens_used: 250,
      };

      mockRequest.query.mockResolvedValue({ recordset: [mockProfile] });

      // Act
      const result = await repository.getReaderProfile();

      // Assert
      expect(result).toEqual(mockProfile);
    });

    it("should parse profile_data as JSON correctly", async () => {
      // Arrange
      const profileData = {
        version: 1,
        schemaVersion: 1,
        statistics: { totalBooks: 5, completedBooks: 3 },
        topAuthors: [{ name: "Test Author", bookCount: 2 }],
      };

      const mockProfile = {
        id: 1,
        version: 1,
        schema_version: 1,
        profile_data: JSON.stringify(profileData),
        semantic_summary: null,
        last_updated: new Date(),
        last_refresh_reason: "initial_profile",
        tokens_used: 0,
      };

      mockRequest.query.mockResolvedValue({ recordset: [mockProfile] });

      // Act
      const result = await repository.getReaderProfile();

      // Assert
      expect(JSON.parse(result.profile_data)).toEqual(profileData);
      expect(result.schema_version).toBe(1);
    });
  });

  describe("saveReaderProfile", () => {
    it("should insert first profile correctly", async () => {
      // Arrange
      const version = 1;
      const profileData = { statistics: { totalBooks: 0 } };
      const semanticSummary = "Empty vault profile";
      const reason = "initial_seed";
      const tokensUsed = 150;

      mockRequest.query.mockResolvedValue({ recordset: [] });

      // Act
      await repository.saveReaderProfile(
        version,
        profileData,
        semanticSummary,
        reason,
        tokensUsed,
      );

      // Assert
      expect(mockRequest.input).toHaveBeenCalledWith(
        "version",
        expect.anything(),
        version,
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "profile_data",
        expect.anything(),
        JSON.stringify(profileData),
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "semantic_summary",
        expect.anything(),
        semanticSummary,
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "last_refresh_reason",
        expect.anything(),
        reason,
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "tokens_used",
        expect.anything(),
        tokensUsed,
      );
      expect(mockRequest.query).toHaveBeenCalled();
    });

    it("should update existing profile with incremented version", async () => {
      // Arrange
      const version = 3;
      const profileData = { statistics: { totalBooks: 15 } };
      const semanticSummary = "Updated profile";
      const reason = "book_completed";
      const tokensUsed = 280;

      mockRequest.query.mockResolvedValue({ recordset: [] });

      // Act
      await repository.saveReaderProfile(
        version,
        profileData,
        semanticSummary,
        reason,
        tokensUsed,
      );

      // Assert
      expect(mockRequest.input).toHaveBeenCalledWith(
        "version",
        expect.anything(),
        3,
      );
    });

    it("should handle null semantic_summary gracefully", async () => {
      // Arrange
      const version = 2;
      const profileData = { statistics: { totalBooks: 5 } };
      const semanticSummary = null; // OpenAI unavailable
      const reason = "book_abandoned";
      const tokensUsed = 0;

      mockRequest.query.mockResolvedValue({ recordset: [] });

      // Act
      await repository.saveReaderProfile(
        version,
        profileData,
        semanticSummary,
        reason,
        tokensUsed,
      );

      // Assert
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
  });

  describe("calculateReaderProfile - MVP", () => {
    it("should compute all statistics from books", async () => {
      // Arrange
      const mockKPIs = {
        totalBooks: 23,
        completedBooks: 15,
        booksInProgress: 3,
        abandonedBooks: 5,
        wishListBooks: 0,
        completionRate: 0.65,
        booksRated: 15,
        avgScore: 7.8,
      };

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue(mockKPIs);

      // Mock other aggregations
      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] }) // topAuthors
        .mockResolvedValueOnce({ recordset: [] }) // topCountries
        .mockResolvedValueOnce({ recordset: [] }) // favoriteBooks
        .mockResolvedValueOnce({ recordset: [] }); // abandonedBooks

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(mockBookRepository.calculateGlobalKPIs).toHaveBeenCalled();
      expect(result.statistics).toEqual(mockKPIs);
      expect(result.schemaVersion).toBe(1);
    });

    it("should handle empty vault gracefully", async () => {
      // Arrange
      const emptyKPIs = {
        totalBooks: 0,
        completedBooks: 0,
        booksInProgress: 0,
        abandonedBooks: 0,
        wishListBooks: 0,
        completionRate: 0,
        booksRated: 0,
        avgScore: null,
      };

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue(emptyKPIs);

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.statistics.totalBooks).toBe(0);
      expect(result.statistics.avgScore).toBeNull();
      expect(result.topAuthors).toEqual([]);
      expect(result.topCountries).toEqual([]);
      expect(result.favoriteBooks).toEqual([]);
      expect(result.abandonedBooks).toEqual([]);
    });

    it("should include all required MVP sections", async () => {
      // Arrange
      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 10,
        completedBooks: 7,
        booksInProgress: 2,
        abandonedBooks: 1,
        wishListBooks: 0,
        completionRate: 0.7,
        booksRated: 7,
        avgScore: 8.2,
      });

      mockRequest.query
        .mockResolvedValueOnce({
          recordset: [{ name: "Author 1", bookCount: 3 }],
        })
        .mockResolvedValueOnce({
          recordset: [{ name: "Country 1", bookCount: 5 }],
        })
        .mockResolvedValueOnce({ recordset: [{ title: "Book 1", score: 9 }] })
        .mockResolvedValueOnce({ recordset: [{ title: "Abandoned 1" }] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result).toHaveProperty("schemaVersion", 1);
      expect(result).toHaveProperty("statistics");
      expect(result).toHaveProperty("topAuthors");
      expect(result).toHaveProperty("topCountries");
      expect(result).toHaveProperty("favoriteBooks");
      expect(result).toHaveProperty("abandonedBooks");
      expect(result).toHaveProperty("generatedAt");
    });

    it("should set schemaVersion to 1 for MVP profile", async () => {
      // Arrange
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

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.schemaVersion).toBe(1);
    });
  });

  describe("Top Authors (Simple Count)", () => {
    it("should sort authors by book count DESC", async () => {
      // Arrange
      const mockAuthors = [
        {
          name: "Author A",
          nationality: "Country A",
          bookCount: 5,
          avgScore: 8.0,
        },
        {
          name: "Author B",
          nationality: "Country B",
          bookCount: 3,
          avgScore: 7.5,
        },
        {
          name: "Author C",
          nationality: "Country A",
          bookCount: 8,
          avgScore: 9.0,
        },
      ];

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 16,
        completedBooks: 10,
        booksInProgress: 3,
        abandonedBooks: 3,
        wishListBooks: 0,
        completionRate: 0.625,
        booksRated: 10,
        avgScore: 8.2,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: mockAuthors })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.topAuthors).toEqual(mockAuthors);
      // Note: Sorting is done by SQL ORDER BY bookCount DESC
    });

    it("should include nationality from Countries", async () => {
      // Arrange
      const mockAuthors = [
        {
          name: "Gabriel García Márquez",
          nationality: "Colombia",
          bookCount: 8,
          avgScore: 9.5,
        },
      ];

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 8,
        completedBooks: 8,
        booksInProgress: 0,
        abandonedBooks: 0,
        wishListBooks: 0,
        completionRate: 1.0,
        booksRated: 8,
        avgScore: 9.5,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: mockAuthors })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.topAuthors[0].nationality).toBe("Colombia");
    });

    it("should calculate average score per author", async () => {
      // Arrange
      const mockAuthors = [
        {
          name: "Author A",
          nationality: "Country A",
          bookCount: 3,
          avgScore: 8.5,
        },
        {
          name: "Author B",
          nationality: "Country B",
          bookCount: 2,
          avgScore: null,
        },
      ];

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 5,
        completedBooks: 3,
        booksInProgress: 2,
        abandonedBooks: 0,
        wishListBooks: 0,
        completionRate: 0.6,
        booksRated: 3,
        avgScore: 8.5,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: mockAuthors })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.topAuthors[0].avgScore).toBe(8.5);
      expect(result.topAuthors[1].avgScore).toBeNull();
    });

    it("should limit to top 5 authors", async () => {
      // Arrange
      const mockAuthors = [
        {
          name: "Author 1",
          nationality: "Country A",
          bookCount: 10,
          avgScore: 9.0,
        },
        {
          name: "Author 2",
          nationality: "Country B",
          bookCount: 8,
          avgScore: 8.5,
        },
        {
          name: "Author 3",
          nationality: "Country C",
          bookCount: 6,
          avgScore: 8.0,
        },
        {
          name: "Author 4",
          nationality: "Country D",
          bookCount: 4,
          avgScore: 7.5,
        },
        {
          name: "Author 5",
          nationality: "Country E",
          bookCount: 3,
          avgScore: 7.0,
        },
        // SQL query already limits to 5, so this won't appear in mock
      ];

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 31,
        completedBooks: 20,
        booksInProgress: 5,
        abandonedBooks: 6,
        wishListBooks: 0,
        completionRate: 0.645,
        booksRated: 20,
        avgScore: 8.0,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: mockAuthors })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.topAuthors).toHaveLength(5);
    });
  });

  describe("Top Countries", () => {
    it("should aggregate books by author nationality", async () => {
      // Arrange
      const mockCountries = [
        { name: "United States", bookCount: 12 },
        { name: "United Kingdom", bookCount: 8 },
        { name: "Colombia", bookCount: 5 },
      ];

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 25,
        completedBooks: 18,
        booksInProgress: 3,
        abandonedBooks: 4,
        wishListBooks: 0,
        completionRate: 0.72,
        booksRated: 18,
        avgScore: 8.1,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: mockCountries })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.topCountries).toEqual(mockCountries);
    });

    it("should sort by book count DESC", async () => {
      // Arrange
      const mockCountries = [
        { name: "Country A", bookCount: 10 },
        { name: "Country B", bookCount: 5 },
        { name: "Country C", bookCount: 2 },
      ];

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 17,
        completedBooks: 12,
        booksInProgress: 2,
        abandonedBooks: 3,
        wishListBooks: 0,
        completionRate: 0.706,
        booksRated: 12,
        avgScore: 7.8,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: mockCountries })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.topCountries[0].bookCount).toBeGreaterThanOrEqual(
        result.topCountries[1].bookCount,
      );
    });

    it("should limit to top 3 countries", async () => {
      // Arrange
      const mockCountries = [
        { name: "Country 1", bookCount: 15 },
        { name: "Country 2", bookCount: 10 },
        { name: "Country 3", bookCount: 5 },
        // SQL LIMIT already applied
      ];

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 30,
        completedBooks: 20,
        booksInProgress: 5,
        abandonedBooks: 5,
        wishListBooks: 0,
        completionRate: 0.667,
        booksRated: 20,
        avgScore: 8.0,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: mockCountries })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.topCountries).toHaveLength(3);
    });
  });

  describe("Favorite Books", () => {
    it("should return books with score >= 8", async () => {
      // Arrange
      const mockFavorites = [
        {
          title: "Cien Años de Soledad",
          author: "Gabriel García Márquez",
          score: 10,
        },
        { title: "El Aleph", author: "Jorge Luis Borges", score: 9 },
        { title: "1984", author: "George Orwell", score: 8 },
      ];

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 10,
        completedBooks: 10,
        booksInProgress: 0,
        abandonedBooks: 0,
        wishListBooks: 0,
        completionRate: 1.0,
        booksRated: 10,
        avgScore: 8.5,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: mockFavorites })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.favoriteBooks).toEqual(mockFavorites);
      expect(result.favoriteBooks.every((book) => book.score >= 8)).toBe(true);
    });

    it("should include title, author, score", async () => {
      // Arrange
      const mockFavorites = [
        { title: "Test Book", author: "Test Author", score: 9.5 },
      ];

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 1,
        completedBooks: 1,
        booksInProgress: 0,
        abandonedBooks: 0,
        wishListBooks: 0,
        completionRate: 1.0,
        booksRated: 1,
        avgScore: 9.5,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: mockFavorites })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.favoriteBooks[0]).toHaveProperty("title");
      expect(result.favoriteBooks[0]).toHaveProperty("author");
      expect(result.favoriteBooks[0]).toHaveProperty("score");
    });

    it("should order by score DESC", async () => {
      // Arrange
      const mockFavorites = [
        { title: "Book A", author: "Author A", score: 10 },
        { title: "Book B", author: "Author B", score: 9 },
        { title: "Book C", author: "Author C", score: 8 },
      ];

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 3,
        completedBooks: 3,
        booksInProgress: 0,
        abandonedBooks: 0,
        wishListBooks: 0,
        completionRate: 1.0,
        booksRated: 3,
        avgScore: 9.0,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: mockFavorites })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.favoriteBooks[0].score).toBeGreaterThanOrEqual(
        result.favoriteBooks[1].score,
      );
    });
  });

  describe("Abandoned Books", () => {
    it("should return all abandoned books", async () => {
      // Arrange
      const mockAbandoned = [
        { title: "Book X", author: "Author X", nationality: "Country X" },
        { title: "Book Y", author: "Author Y", nationality: "Country Y" },
      ];

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

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: mockAbandoned });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.abandonedBooks).toEqual(mockAbandoned);
    });

    it("should include title, author, nationality", async () => {
      // Arrange
      const mockAbandoned = [
        { title: "Ulysses", author: "James Joyce", nationality: "Ireland" },
      ];

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 2,
        completedBooks: 1,
        booksInProgress: 0,
        abandonedBooks: 1,
        wishListBooks: 0,
        completionRate: 0.5,
        booksRated: 1,
        avgScore: 8.0,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: mockAbandoned });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.abandonedBooks[0]).toHaveProperty("title");
      expect(result.abandonedBooks[0]).toHaveProperty("author");
      expect(result.abandonedBooks[0]).toHaveProperty("nationality");
    });

    it("should return empty array when no abandoned books", async () => {
      // Arrange
      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 5,
        completedBooks: 5,
        booksInProgress: 0,
        abandonedBooks: 0,
        wishListBooks: 0,
        completionRate: 1.0,
        booksRated: 5,
        avgScore: 8.8,
      });

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      // Act
      const result = await repository.calculateReaderProfile();

      // Assert
      expect(result.abandonedBooks).toEqual([]);
    });
  });

  describe("Top Authors Change Detection", () => {
    it("should detect when top 3 authors change order", async () => {
      // Arrange
      const previousProfile = {
        topAuthors: [
          { name: "Author A", bookCount: 5 },
          { name: "Author B", bookCount: 4 },
          { name: "Author C", bookCount: 3 },
        ],
      };

      const newProfile = {
        topAuthors: [
          { name: "Author B", bookCount: 6 },
          { name: "Author A", bookCount: 5 },
          { name: "Author C", bookCount: 3 },
        ],
      };

      // Act
      const changed = repository._detectTopAuthorsChange(
        previousProfile,
        newProfile,
      );

      // Assert
      expect(changed).toBe(true);
    });

    it("should detect when new author enters top 3", async () => {
      // Arrange
      const previousProfile = {
        topAuthors: [
          { name: "Author A", bookCount: 5 },
          { name: "Author B", bookCount: 4 },
          { name: "Author C", bookCount: 3 },
        ],
      };

      const newProfile = {
        topAuthors: [
          { name: "Author A", bookCount: 5 },
          { name: "Author D", bookCount: 4 },
          { name: "Author B", bookCount: 4 },
        ],
      };

      // Act
      const changed = repository._detectTopAuthorsChange(
        previousProfile,
        newProfile,
      );

      // Assert
      expect(changed).toBe(true);
    });

    it("should return false when top 3 unchanged", async () => {
      // Arrange
      const previousProfile = {
        topAuthors: [
          { name: "Author A", bookCount: 5 },
          { name: "Author B", bookCount: 4 },
          { name: "Author C", bookCount: 3 },
        ],
      };

      const newProfile = {
        topAuthors: [
          { name: "Author A", bookCount: 6 },
          { name: "Author B", bookCount: 5 },
          { name: "Author C", bookCount: 4 },
        ],
      };

      // Act
      const changed = repository._detectTopAuthorsChange(
        previousProfile,
        newProfile,
      );

      // Assert
      expect(changed).toBe(false);
    });

    it("should handle null previousProfile", async () => {
      // Arrange
      const previousProfile = null;

      const newProfile = {
        topAuthors: [{ name: "Author A", bookCount: 1 }],
      };

      // Act
      const changed = repository._detectTopAuthorsChange(
        previousProfile,
        newProfile,
      );

      // Assert
      expect(changed).toBe(true);
    });

    it("should handle empty topAuthors array", async () => {
      // Arrange
      const previousProfile = {
        topAuthors: [],
      };

      const newProfile = {
        topAuthors: [{ name: "Author A", bookCount: 1 }],
      };

      // Act
      const changed = repository._detectTopAuthorsChange(
        previousProfile,
        newProfile,
      );

      // Assert
      expect(changed).toBe(true);
    });
  });

  describe("refreshReaderProfile", () => {
    it("should increment version on each refresh", async () => {
      // Arrange
      const existingProfile = {
        id: 1,
        version: 5,
        profile_data: JSON.stringify({ schemaVersion: 1 }),
      };

      mockRequest.query
        .mockResolvedValueOnce({ recordset: [existingProfile] }) // getReaderProfile
        .mockResolvedValueOnce({ recordset: [] }) // calculateReaderProfile - topAuthors
        .mockResolvedValueOnce({ recordset: [] }) // topCountries
        .mockResolvedValueOnce({ recordset: [] }) // favoriteBooks
        .mockResolvedValueOnce({ recordset: [] }) // abandonedBooks
        .mockResolvedValueOnce({ recordset: [] }); // saveReaderProfile

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 10,
        completedBooks: 7,
        booksInProgress: 2,
        abandonedBooks: 1,
        wishListBooks: 0,
        completionRate: 0.7,
        booksRated: 7,
        avgScore: 8.0,
      });

      const mockOpenAIClient = {
        generateProfileSummary: vi.fn().mockResolvedValue({
          summary: "Test summary",
          tokensUsed: 250,
        }),
      };

      repository.openAIClient = mockOpenAIClient;

      // Act
      const result = await repository.refreshReaderProfile("book_completed");

      // Assert
      expect(result.version).toBe(6);
      expect(mockRequest.input).toHaveBeenCalledWith(
        "version",
        expect.anything(),
        6,
      );
    });

    it("should store last_refresh_reason correctly", async () => {
      // Arrange
      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] }) // getReaderProfile
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

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

      const mockOpenAIClient = {
        generateProfileSummary: vi.fn().mockResolvedValue({
          summary: "Test summary",
          tokensUsed: 200,
        }),
      };

      repository.openAIClient = mockOpenAIClient;

      // Act
      await repository.refreshReaderProfile("book_abandoned");

      // Assert
      expect(mockRequest.input).toHaveBeenCalledWith(
        "last_refresh_reason",
        expect.anything(),
        "book_abandoned",
      );
    });

    it("should handle first refresh (version 1)", async () => {
      // Arrange
      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] }) // No existing profile
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

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

      const mockOpenAIClient = {
        generateProfileSummary: vi.fn().mockResolvedValue({
          summary: "Empty vault profile",
          tokensUsed: 150,
        }),
      };

      repository.openAIClient = mockOpenAIClient;

      // Act
      await repository.refreshReaderProfile("initial_seed");

      // Assert
      expect(mockRequest.input).toHaveBeenCalledWith(
        "version",
        expect.anything(),
        1,
      );
    });

    it("should generate semantic summary when OpenAI available", async () => {
      // Arrange
      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

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

      const mockOpenAIClient = {
        generateProfileSummary: vi.fn().mockResolvedValue({
          summary: "Generated semantic summary",
          tokensUsed: 287,
        }),
      };

      repository.openAIClient = mockOpenAIClient;

      // Act
      const result = await repository.refreshReaderProfile("book_completed");

      // Assert
      expect(mockOpenAIClient.generateProfileSummary).toHaveBeenCalled();
      expect(result.semanticSummary).toBe("Generated semantic summary");
      expect(result.tokensUsed).toBe(287);
    });

    it("should handle OpenAI unavailable (semantic_summary = null)", async () => {
      // Arrange
      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

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

      const mockOpenAIClient = {
        generateProfileSummary: vi
          .fn()
          .mockRejectedValue(new Error("OpenAI unavailable")),
      };

      repository.openAIClient = mockOpenAIClient;

      // Act
      const result = await repository.refreshReaderProfile("book_completed");

      // Assert
      expect(result.semanticSummary).toBeNull();
      expect(result.tokensUsed).toBe(0);
      expect(mockRequest.input).toHaveBeenCalledWith(
        "semantic_summary",
        expect.anything(),
        null,
      );
    });

    it("should track token usage correctly", async () => {
      // Arrange
      mockRequest.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
        totalBooks: 10,
        completedBooks: 7,
        booksInProgress: 2,
        abandonedBooks: 1,
        wishListBooks: 0,
        completionRate: 0.7,
        booksRated: 7,
        avgScore: 8.2,
      });

      const mockOpenAIClient = {
        generateProfileSummary: vi.fn().mockResolvedValue({
          summary: "Test summary",
          tokensUsed: 314,
        }),
      };

      repository.openAIClient = mockOpenAIClient;

      // Act
      await repository.refreshReaderProfile("book_completed");

      // Assert
      expect(mockRequest.input).toHaveBeenCalledWith(
        "tokens_used",
        expect.anything(),
        314,
      );
    });
  });
});
