/**
 * GetBookByIdService Test Suite
 * Tests for GetBookById query use case
 *
 * Pattern: AAA (Arrange-Act-Assert)
 * Target Coverage: ≥ 80%
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetBookByIdService } from "../services/getBookByIdService.js";
import { NotFoundError } from "../errors/http/NotFoundError.js";
import { Book } from "../models/Book.js";
import { BookStatus } from "@reading-vault/common";

describe("GetBookByIdService", () => {
  let service;
  let mockBookRepository;
  let mockReadingSessionRepository;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock repositories
    mockBookRepository = {
      getById: vi.fn(),
    };

    mockReadingSessionRepository = {
      getCurrentCycleStats: vi.fn(),
      getCycleHistory: vi.fn(),
    };

    // Instantiate service
    service = new GetBookByIdService(
      mockBookRepository,
      mockReadingSessionRepository,
    );
  });

  describe("✅ Happy Paths", () => {
    it("should return complete book details with statistics", async () => {
      // Arrange
      const bookId = 1;
      const mockBook = new Book({
        id: 1,
        title: "Clean Architecture",
        isbn: "9780134494166",
        authorId: 1,
        authorName: "Robert C. Martin",
        authorNationality: "United States",
        totalPages: 432,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      const mockCurrentCycleStats = {
        sessions_count: 5,
        pages_read: 200,
        first_session_date: new Date("2026-01-01"),
        last_session_date: new Date("2026-01-10"),
      };

      const mockCycleHistory = [
        {
          cycle_number: 1,
          sessions_count: 5,
          total_pages_read: 200,
          first_session: new Date("2026-01-01"),
          last_session: new Date("2026-01-10"),
          duration_days: 9,
        },
      ];

      mockBookRepository.getById.mockResolvedValue(mockBook);
      mockReadingSessionRepository.getCurrentCycleStats.mockResolvedValue(
        mockCurrentCycleStats,
      );
      mockReadingSessionRepository.getCycleHistory.mockResolvedValue(
        mockCycleHistory,
      );

      // Act
      const result = await service.execute(bookId);

      // Assert
      expect(mockBookRepository.getById).toHaveBeenCalledWith(bookId);
      expect(
        mockReadingSessionRepository.getCurrentCycleStats,
      ).toHaveBeenCalledWith(bookId, 1);
      expect(mockReadingSessionRepository.getCycleHistory).toHaveBeenCalledWith(
        bookId,
      );

      expect(result).toMatchObject({
        book: {
          id: 1,
          title: "Clean Architecture",
          isbn: "9780134494166",
          author: {
            id: 1,
            name: "Robert C. Martin",
            nationality: "United States",
          },
          total_pages: 432,
          status: BookStatus.READING,
          current_reading_cycle: 1,
          pages_read_total: 200,
          pages_read_in_current_cycle: 200,
        },
        current_cycle_stats: {
          sessions_count: 5,
          first_session_date: mockCurrentCycleStats.first_session_date,
          last_session_date: mockCurrentCycleStats.last_session_date,
          days_elapsed: 10,
          velocity: 20,
          estimated_completion: expect.any(Date),
        },
        reading_cycles: [
          {
            cycle_number: 1,
            status: BookStatus.READING,
            sessions_count: 5,
            total_pages_read: 200,
            first_session: mockCycleHistory[0].first_session,
            last_session: mockCycleHistory[0].last_session,
            duration_days: 10,
          },
        ],
      });
    });

    it("should return book with no reading sessions", async () => {
      // Arrange
      const bookId = 1;
      const mockBook = new Book({
        id: 1,
        title: "Domain-Driven Design",
        isbn: "9780321125217",
        authorId: 2,
        authorName: "Eric Evans",
        authorNationality: "United States",
        totalPages: 560,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      const mockCurrentCycleStats = {
        sessions_count: 0,
        pages_read: 0,
        first_session_date: null,
        last_session_date: null,
      };

      const mockCycleHistory = [];

      mockBookRepository.getById.mockResolvedValue(mockBook);
      mockReadingSessionRepository.getCurrentCycleStats.mockResolvedValue(
        mockCurrentCycleStats,
      );
      mockReadingSessionRepository.getCycleHistory.mockResolvedValue(
        mockCycleHistory,
      );

      // Act
      const result = await service.execute(bookId);

      // Assert
      expect(result).toMatchObject({
        book: {
          id: 1,
          status: BookStatus.WISH_LIST,
          pages_read_total: 0,
          pages_read_in_current_cycle: 0,
        },
        current_cycle_stats: {
          sessions_count: 0,
          first_session_date: null,
          last_session_date: null,
          days_elapsed: 0,
          velocity: null,
          estimated_completion: null,
        },
        reading_cycles: [],
      });
    });

    it("should return book with multiple reading cycles", async () => {
      // Arrange
      const bookId = 1;
      const mockBook = new Book({
        id: 1,
        title: "Refactoring",
        isbn: "9780134757599",
        authorId: 3,
        authorName: "Martin Fowler",
        authorNationality: "United Kingdom",
        totalPages: 448,
        status: BookStatus.READING,
        currentReadingCycle: 2,
        score: null,
        comment: null,
      });

      const mockCurrentCycleStats = {
        sessions_count: 3,
        pages_read: 150,
        first_session_date: new Date("2026-02-01"),
        last_session_date: new Date("2026-02-05"),
      };

      const mockCycleHistory = [
        {
          cycle_number: 1,
          sessions_count: 10,
          total_pages_read: 448,
          first_session: new Date("2025-12-01"),
          last_session: new Date("2025-12-31"),
          duration_days: 30,
        },
        {
          cycle_number: 2,
          sessions_count: 3,
          total_pages_read: 150,
          first_session: new Date("2026-02-01"),
          last_session: new Date("2026-02-05"),
          duration_days: 4,
        },
      ];

      mockBookRepository.getById.mockResolvedValue(mockBook);
      mockReadingSessionRepository.getCurrentCycleStats.mockResolvedValue(
        mockCurrentCycleStats,
      );
      mockReadingSessionRepository.getCycleHistory.mockResolvedValue(
        mockCycleHistory,
      );

      // Act
      const result = await service.execute(bookId);

      // Assert
      expect(result.book.pages_read_total).toBe(598); // 448 + 150
      expect(result.book.current_reading_cycle).toBe(2);
      expect(result.reading_cycles).toHaveLength(2);
      expect(result.reading_cycles[0].status).toBe(BookStatus.READING); // Previous cycle
      expect(result.reading_cycles[1].status).toBe(BookStatus.READING); // Current cycle
    });

    it("should calculate velocity and estimated completion correctly", async () => {
      // Arrange
      const bookId = 1;
      const mockBook = new Book({
        id: 1,
        title: "Clean Code",
        isbn: "9780132350884",
        authorId: 1,
        authorName: "Robert C. Martin",
        authorNationality: "United States",
        totalPages: 464,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Read 100 pages in 10 days = 10 pages/day
      const mockCurrentCycleStats = {
        sessions_count: 10,
        pages_read: 100,
        first_session_date: new Date("2026-01-01"),
        last_session_date: new Date("2026-01-10"),
      };

      const mockCycleHistory = [
        {
          cycle_number: 1,
          sessions_count: 10,
          total_pages_read: 100,
          first_session: new Date("2026-01-01"),
          last_session: new Date("2026-01-10"),
          duration_days: 9,
        },
      ];

      mockBookRepository.getById.mockResolvedValue(mockBook);
      mockReadingSessionRepository.getCurrentCycleStats.mockResolvedValue(
        mockCurrentCycleStats,
      );
      mockReadingSessionRepository.getCycleHistory.mockResolvedValue(
        mockCycleHistory,
      );

      // Act
      const result = await service.execute(bookId);

      // Assert
      expect(result.current_cycle_stats.days_elapsed).toBe(10);
      expect(result.current_cycle_stats.velocity).toBe(10); // 100 pages / 10 days

      // Remaining pages: 464 - 100 = 364
      // Days to complete: ceil(364 / 10) = 37
      // Days since last session: from 2026-01-10 to today (test runs ~2026-02-21) ≈ 42 days
      // Expected completion: TODAY + 42 (inactivity penalty) + 37 (days to complete) ≈ 79 days from today
      // This means estimated date should be in late April/early May
      const estimatedDate = new Date(
        result.current_cycle_stats.estimated_completion,
      );
      const today = new Date();

      // Verify estimated completion is in the future
      expect(estimatedDate.getTime()).toBeGreaterThan(today.getTime());

      // Verify it's roughly 79 days from today (allow some tolerance)
      const daysDifference = Math.ceil(
        (estimatedDate - today) / (1000 * 60 * 60 * 24),
      );
      expect(daysDifference).toBeGreaterThanOrEqual(75);
      expect(daysDifference).toBeLessThanOrEqual(85);
    });

    it("should handle completed book with score and comment", async () => {
      // Arrange
      const bookId = 1;
      const mockBook = new Book({
        id: 1,
        title: "The Pragmatic Programmer",
        isbn: "9780135957059",
        authorId: 4,
        authorName: "Dave Thomas",
        authorNationality: "Canada",
        totalPages: 352,
        status: BookStatus.COMPLETED,
        currentReadingCycle: 1,
        score: 5,
        comment: "Excellent book for developers!",
      });

      const mockCurrentCycleStats = {
        sessions_count: 8,
        pages_read: 352,
        first_session_date: new Date("2026-01-01"),
        last_session_date: new Date("2026-01-15"),
      };

      const mockCycleHistory = [
        {
          cycle_number: 1,
          sessions_count: 8,
          total_pages_read: 352,
          first_session: new Date("2026-01-01"),
          last_session: new Date("2026-01-15"),
          duration_days: 14,
        },
      ];

      mockBookRepository.getById.mockResolvedValue(mockBook);
      mockReadingSessionRepository.getCurrentCycleStats.mockResolvedValue(
        mockCurrentCycleStats,
      );
      mockReadingSessionRepository.getCycleHistory.mockResolvedValue(
        mockCycleHistory,
      );

      // Act
      const result = await service.execute(bookId);

      // Assert
      expect(result.book.status).toBe(BookStatus.COMPLETED);
      expect(result.book.score).toBe(5);
      expect(result.book.comment).toBe("Excellent book for developers!");
      expect(result.current_cycle_stats.estimated_completion).toBeNull(); // No remaining pages
    });

    it("should handle book with null author nationality", async () => {
      // Arrange
      const bookId = 1;
      const mockBook = new Book({
        id: 1,
        title: "Unknown Author Book",
        isbn: "1234567890123",
        authorId: 5,
        authorName: "Unknown Author",
        authorNationality: null,
        totalPages: 200,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      const mockCurrentCycleStats = {
        sessions_count: 0,
        pages_read: 0,
        first_session_date: null,
        last_session_date: null,
      };

      const mockCycleHistory = [];

      mockBookRepository.getById.mockResolvedValue(mockBook);
      mockReadingSessionRepository.getCurrentCycleStats.mockResolvedValue(
        mockCurrentCycleStats,
      );
      mockReadingSessionRepository.getCycleHistory.mockResolvedValue(
        mockCycleHistory,
      );

      // Act
      const result = await service.execute(bookId);

      // Assert
      expect(result.book.author.nationality).toBeNull();
    });
  });

  describe("❌ Error Paths", () => {
    it("should throw NotFoundError when book does not exist", async () => {
      // Arrange
      const bookId = 999;
      mockBookRepository.getById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute(bookId)).rejects.toThrow(NotFoundError);
    });

    it("should propagate repository errors from bookRepository", async () => {
      // Arrange
      const bookId = 1;
      const repositoryError = new Error("Database connection failed");
      mockBookRepository.getById.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(service.execute(bookId)).rejects.toThrow(
        "Database connection failed",
      );
    });

    it("should propagate repository errors from readingSessionRepository", async () => {
      // Arrange
      const bookId = 1;
      const mockBook = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockBookRepository.getById.mockResolvedValue(mockBook);

      const repositoryError = new Error("Failed to fetch reading sessions");
      mockReadingSessionRepository.getCurrentCycleStats.mockRejectedValue(
        repositoryError,
      );

      // Act & Assert
      await expect(service.execute(bookId)).rejects.toThrow(
        "Failed to fetch reading sessions",
      );
    });
  });

  describe("🔍 Edge Cases", () => {
    it("should handle single day reading session (days_elapsed = 1)", async () => {
      // Arrange
      const bookId = 1;
      const mockBook = new Book({
        id: 1,
        title: "Quick Read",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Speed Reader",
        authorNationality: "Fast Country",
        totalPages: 100,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      const sameDate = new Date("2026-01-15");
      const mockCurrentCycleStats = {
        sessions_count: 1,
        pages_read: 50,
        first_session_date: sameDate,
        last_session_date: sameDate,
      };

      const mockCycleHistory = [
        {
          cycle_number: 1,
          sessions_count: 1,
          total_pages_read: 50,
          first_session: sameDate,
          last_session: sameDate,
          duration_days: 0,
        },
      ];

      mockBookRepository.getById.mockResolvedValue(mockBook);
      mockReadingSessionRepository.getCurrentCycleStats.mockResolvedValue(
        mockCurrentCycleStats,
      );
      mockReadingSessionRepository.getCycleHistory.mockResolvedValue(
        mockCycleHistory,
      );

      // Act
      const result = await service.execute(bookId);

      // Assert
      expect(result.current_cycle_stats.days_elapsed).toBe(1);
      expect(result.current_cycle_stats.velocity).toBe(50); // 50 pages / 1 day
    });

    it("should not calculate estimated completion when all pages are read", async () => {
      // Arrange
      const bookId = 1;
      const mockBook = new Book({
        id: 1,
        title: "Almost Done",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      const mockCurrentCycleStats = {
        sessions_count: 5,
        pages_read: 200, // All pages read
        first_session_date: new Date("2026-01-01"),
        last_session_date: new Date("2026-01-10"),
      };

      const mockCycleHistory = [
        {
          cycle_number: 1,
          sessions_count: 5,
          total_pages_read: 200,
          first_session: new Date("2026-01-01"),
          last_session: new Date("2026-01-10"),
          duration_days: 9,
        },
      ];

      mockBookRepository.getById.mockResolvedValue(mockBook);
      mockReadingSessionRepository.getCurrentCycleStats.mockResolvedValue(
        mockCurrentCycleStats,
      );
      mockReadingSessionRepository.getCycleHistory.mockResolvedValue(
        mockCycleHistory,
      );

      // Act
      const result = await service.execute(bookId);

      // Assert
      expect(result.current_cycle_stats.velocity).toBe(20); // Still calculates velocity
      expect(result.current_cycle_stats.estimated_completion).toBeNull(); // No remaining pages
    });
  });
});
