/**
 * LogReadingSessionService Tests
 * Tests for the LogReadingSession use case
 *
 * Coverage:
 * - Guard clauses (ABANDONED status, PENDING_SCORE status)
 * - Smart transitions (WISH_LIST → READING, COMPLETED → READING, READING → PENDING_SCORE)
 * - Validation (pages_read constraint)
 * - Transaction rollback on failure
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BookStatus } from "@reading-vault/common";
import { Book } from "../models/Book.js";
import { ReadingSession } from "../models/ReadingSession.js";
import {
  BookClosedError,
  NotFoundError,
  BadRequestError,
} from "../errors/index.js";

// Mock transaction (must be defined before vi.mock)
const mockTransaction = {
  begin: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
  request: vi.fn().mockReturnThis(),
};

// Mock mssql module (must be hoisted)
vi.mock("mssql", () => ({
  default: {
    Transaction: vi.fn(() => mockTransaction),
  },
}));

// Import service AFTER mocks are set up
import { LogReadingSessionService } from "../services/logReadingSessionService.js";

describe("LogReadingSessionService", () => {
  let service;
  let mockMssqlClient;
  let mockBookRepository;
  let mockReadingSessionRepository;
  let mockBookStatusHistoryRepository;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock MSSQL client
    mockMssqlClient = {
      getConnection: vi.fn().mockResolvedValue({}),
    };

    // Create mock repositories
    mockBookRepository = {
      getById: vi.fn(),
      updateStatus: vi.fn(),
    };

    mockReadingSessionRepository = {
      create: vi.fn(),
      getTotalPagesInCycle: vi.fn(),
    };

    mockBookStatusHistoryRepository = {
      create: vi.fn(),
    };

    // Instantiate service
    service = new LogReadingSessionService(
      mockMssqlClient,
      mockBookRepository,
      mockReadingSessionRepository,
      mockBookStatusHistoryRepository,
    );
  });

  describe("Guard Clause: ABANDONED Status", () => {
    it("should throw BookClosedError when book is ABANDONED", async () => {
      // Arrange
      const input = { bookId: 1, pagesRead: 50 };
      const abandonedBook = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.ABANDONED,
        totalPages: 300,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(abandonedBook);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(BookClosedError);
      // Note: Transaction never begins for validation errors, so rollback is not called
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });
  });

  describe("Guard Clause: PENDING_SCORE Status", () => {
    it("should throw BookPendingReviewError when book is PENDING_SCORE", async () => {
      // Arrange
      const input = { bookId: 1, pagesRead: 50 };
      const pendingScoreBook = new Book({
        id: 1,
        title: "Needs Review",
        status: BookStatus.PENDING_SCORE,
        totalPages: 300,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(pendingScoreBook);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow();
      // Note: Transaction never begins for validation errors, so rollback is not called
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });
  });

  describe("Guard Clause: Book Not Found", () => {
    it("should throw NotFoundError when book does not exist", async () => {
      // Arrange
      const input = { bookId: 999, pagesRead: 50 };
      mockBookRepository.getById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(NotFoundError);
      // Note: Transaction never begins when book not found, so rollback is not called
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });
  });

  describe("Validation: Pages Read Constraint", () => {
    it("should throw BadRequestError when pages_read exceeds remaining pages", async () => {
      // Arrange
      const input = { bookId: 1, pagesRead: 200 };
      const book = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(150);

      // Act & Assert
      // 150 (current) + 200 (new) = 350 > 300 (total)
      await expect(service.execute(input)).rejects.toThrow(BadRequestError);
      // Note: Transaction never begins for validation errors, so rollback is not called
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should allow pages_read that equals remaining pages exactly", async () => {
      // Arrange
      const input = { bookId: 1, pagesRead: 150 };
      const book = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1,
      });

      const expectedSession = new ReadingSession({
        id: 1,
        bookId: 1,
        pagesRead: 150,
        readingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(150);
      mockReadingSessionRepository.create.mockResolvedValue(expectedSession);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(result).toEqual(expectedSession);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe("Smart Transition: WISH_LIST → READING", () => {
    it("should transition WISH_LIST to READING when logging first session", async () => {
      // Arrange
      const input = { bookId: 1, pagesRead: 50 };
      const wishlistBook = new Book({
        id: 1,
        title: "New Book",
        status: BookStatus.WISH_LIST,
        totalPages: 300,
        currentReadingCycle: 1,
      });

      const expectedSession = new ReadingSession({
        id: 1,
        bookId: 1,
        pagesRead: 50,
        readingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(wishlistBook);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(0);
      mockReadingSessionRepository.create.mockResolvedValue(expectedSession);

      // Act
      await service.execute(input);

      // Assert
      expect(mockBookRepository.updateStatus).toHaveBeenCalledWith(
        1,
        BookStatus.READING,
        1,
        mockTransaction,
      );
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        {
          bookId: 1,
          oldStatus: BookStatus.WISH_LIST,
          newStatus: BookStatus.READING,
          readingCycle: 1,
        },
        mockTransaction,
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe("Smart Transition: COMPLETED → READING (Re-reading)", () => {
    it("should increment cycle when logging session on COMPLETED book", async () => {
      // Arrange
      const input = { bookId: 1, pagesRead: 50 };
      const completedBook = new Book({
        id: 1,
        title: "Completed Book",
        status: BookStatus.COMPLETED,
        totalPages: 300,
        currentReadingCycle: 1,
      });

      const expectedSession = new ReadingSession({
        id: 1,
        bookId: 1,
        pagesRead: 50,
        readingCycle: 2, // Cycle incremented
      });

      mockBookRepository.getById.mockResolvedValue(completedBook);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(0);
      mockReadingSessionRepository.create.mockResolvedValue(expectedSession);

      // Act
      await service.execute(input);

      // Assert
      expect(mockBookRepository.updateStatus).toHaveBeenCalledWith(
        1,
        BookStatus.READING,
        2, // Cycle incremented
        mockTransaction,
      );
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        {
          bookId: 1,
          oldStatus: BookStatus.COMPLETED,
          newStatus: BookStatus.READING,
          readingCycle: 2,
        },
        mockTransaction,
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe("Smart Transition: Auto-Completion", () => {
    it("should transition to PENDING_SCORE when pages_read reaches total_pages", async () => {
      // Arrange
      const input = { bookId: 1, pagesRead: 100 };
      const readingBook = new Book({
        id: 1,
        title: "Almost Done",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1,
      });

      const expectedSession = new ReadingSession({
        id: 1,
        bookId: 1,
        pagesRead: 100,
        readingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(readingBook);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(200); // 200 + 100 = 300
      mockReadingSessionRepository.create.mockResolvedValue(expectedSession);

      // Act
      await service.execute(input);

      // Assert
      expect(mockBookRepository.updateStatus).toHaveBeenCalledWith(
        1,
        BookStatus.PENDING_SCORE,
        1,
        mockTransaction,
      );
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        {
          bookId: 1,
          oldStatus: BookStatus.READING,
          newStatus: BookStatus.PENDING_SCORE,
          readingCycle: 1,
        },
        mockTransaction,
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it("should NOT auto-complete when pages_read is less than total_pages", async () => {
      // Arrange
      const input = { bookId: 1, pagesRead: 50 };
      const readingBook = new Book({
        id: 1,
        title: "In Progress",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1,
      });

      const expectedSession = new ReadingSession({
        id: 1,
        bookId: 1,
        pagesRead: 50,
        readingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(readingBook);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(100); // 100 + 50 = 150 < 300
      mockReadingSessionRepository.create.mockResolvedValue(expectedSession);

      // Act
      await service.execute(input);

      // Assert
      expect(mockBookRepository.updateStatus).not.toHaveBeenCalled();
      expect(mockBookStatusHistoryRepository.create).not.toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe("Transaction Integrity", () => {
    it("should rollback transaction on any error", async () => {
      // Arrange
      const input = { bookId: 1, pagesRead: 50 };
      const book = new Book({
        id: 1,
        title: "Test",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(0);
      mockReadingSessionRepository.create.mockRejectedValue(
        new Error("DB Error"),
      );

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow("DB Error");
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  describe("occurredAt handling", () => {
    it("should use provided occurredAt date", async () => {
      // Arrange
      const customDate = new Date("2026-01-15T10:00:00Z");
      const input = { bookId: 1, pagesRead: 50, occurredAt: customDate };
      const book = new Book({
        id: 1,
        title: "Test",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(0);
      mockReadingSessionRepository.create.mockResolvedValue({});

      // Act
      await service.execute(input);

      // Assert
      expect(mockReadingSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          occurredAt: customDate,
        }),
        mockTransaction,
      );
    });

    it("should default to current date when occurredAt is not provided", async () => {
      // Arrange
      const input = { bookId: 1, pagesRead: 50 };
      const book = new Book({
        id: 1,
        title: "Test",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(0);
      mockReadingSessionRepository.create.mockResolvedValue({});

      // Act
      await service.execute(input);

      // Assert
      expect(mockReadingSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          occurredAt: expect.any(Date),
        }),
        mockTransaction,
      );
    });
  });
});
