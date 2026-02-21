/**
 * RequestReviewService Tests
 * Tests for the RequestReview use case (manual READING → PENDING_SCORE)
 *
 * Coverage:
 * - READING → PENDING_SCORE transition
 * - Invalid state transition errors
 * - History entry creation
 * - Transaction rollback on failure
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { RequestReviewService } from "../services/requestReviewService.js";
import { Book } from "../models/Book.js";
import { BookStatus } from "@reading-vault/common";
import { NotFoundError, InvalidStateTransitionError } from "../errors/index.js";

// Mock transaction
const mockTransaction = {
  begin: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
};

// Mock SQL module
vi.mock("mssql", () => ({
  default: {
    Transaction: vi.fn(() => mockTransaction),
  },
}));

describe("RequestReviewService", () => {
  let service;
  let mockMssqlClient;
  let mockBookRepository;
  let mockBookStatusHistoryRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMssqlClient = {
      getConnection: vi.fn().mockResolvedValue({}),
    };

    mockBookRepository = {
      getById: vi.fn(),
      updateStatus: vi.fn(),
    };

    mockBookStatusHistoryRepository = {
      create: vi.fn(),
    };

    service = new RequestReviewService(
      mockMssqlClient,
      mockBookRepository,
      mockBookStatusHistoryRepository,
    );
  });

  describe("READING → PENDING_SCORE (Manual)", () => {
    it("should transition a READING book to PENDING_SCORE", async () => {
      // Arrange
      const readingBook = new Book({
        id: 1,
        title: "Partially Read Book",
        status: BookStatus.READING,
        currentReadingCycle: 1,
        totalPages: 300,
        authorId: 1,
        authorName: "Test Author",
      });

      const pendingScoreBook = new Book({
        id: 1,
        title: "Partially Read Book",
        status: BookStatus.PENDING_SCORE,
        currentReadingCycle: 1,
        totalPages: 300,
        authorId: 1,
        authorName: "Test Author",
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(readingBook)
        .mockResolvedValueOnce(pendingScoreBook);

      // Act
      const result = await service.execute(1);

      // Assert
      expect(result).toEqual(pendingScoreBook);
      expect(mockBookRepository.updateStatus).toHaveBeenCalledWith(
        1,
        BookStatus.PENDING_SCORE,
        1, // Same cycle
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
      expect(mockTransaction.begin).toHaveBeenCalledTimes(1);
      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });

    it("should maintain the same cycle when requesting review", async () => {
      // Arrange
      const readingBook = new Book({
        id: 2,
        title: "Multi-Cycle Book",
        status: BookStatus.READING,
        currentReadingCycle: 3,
        totalPages: 500,
        authorId: 1,
        authorName: "Test Author",
      });

      const pendingScoreBook = new Book({
        id: 2,
        title: "Multi-Cycle Book",
        status: BookStatus.PENDING_SCORE,
        currentReadingCycle: 3,
        totalPages: 500,
        authorId: 1,
        authorName: "Test Author",
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(readingBook)
        .mockResolvedValueOnce(pendingScoreBook);

      // Act
      const result = await service.execute(2);

      // Assert
      expect(result.currentReadingCycle).toBe(3);
      expect(mockBookRepository.updateStatus).toHaveBeenCalledWith(
        2,
        BookStatus.PENDING_SCORE,
        3, // Same cycle as before
        mockTransaction,
      );
    });
  });

  describe("Error Handling", () => {
    it("should throw NotFoundError if book does not exist", async () => {
      // Arrange
      mockBookRepository.getById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute(999)).rejects.toThrow(NotFoundError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should throw InvalidStateTransitionError if book is not READING", async () => {
      // Arrange
      const completedBook = new Book({
        id: 1,
        title: "Completed Book",
        status: BookStatus.COMPLETED,
        currentReadingCycle: 1,
        score: 9.0,
        authorId: 1,
        authorName: "Test Author",
      });

      mockBookRepository.getById.mockResolvedValue(completedBook);

      // Act & Assert
      await expect(service.execute(1)).rejects.toThrow(
        InvalidStateTransitionError,
      );
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should throw InvalidStateTransitionError if book is WISH_LIST", async () => {
      // Arrange
      const wishListBook = new Book({
        id: 1,
        title: "Wish List Book",
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        authorId: 1,
        authorName: "Test Author",
      });

      mockBookRepository.getById.mockResolvedValue(wishListBook);

      // Act & Assert
      await expect(service.execute(1)).rejects.toThrow(
        InvalidStateTransitionError,
      );
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should throw InvalidStateTransitionError if book is ABANDONED", async () => {
      // Arrange
      const abandonedBook = new Book({
        id: 1,
        title: "Abandoned Book",
        status: BookStatus.ABANDONED,
        currentReadingCycle: 1,
        score: 3.0,
        authorId: 1,
        authorName: "Test Author",
      });

      mockBookRepository.getById.mockResolvedValue(abandonedBook);

      // Act & Assert
      await expect(service.execute(1)).rejects.toThrow(
        InvalidStateTransitionError,
      );
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should throw InvalidStateTransitionError if book is already PENDING_SCORE", async () => {
      // Arrange
      const pendingScoreBook = new Book({
        id: 1,
        title: "Already Pending Score",
        status: BookStatus.PENDING_SCORE,
        currentReadingCycle: 1,
        authorId: 1,
        authorName: "Test Author",
      });

      mockBookRepository.getById.mockResolvedValue(pendingScoreBook);

      // Act & Assert
      await expect(service.execute(1)).rejects.toThrow(
        InvalidStateTransitionError,
      );
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should rollback transaction on repository error", async () => {
      // Arrange
      const readingBook = new Book({
        id: 1,
        title: "Reading Book",
        status: BookStatus.READING,
        currentReadingCycle: 1,
        authorId: 1,
        authorName: "Test Author",
      });

      mockBookRepository.getById.mockResolvedValue(readingBook);
      const errorMessage = "Database connection lost";
      mockBookRepository.updateStatus.mockRejectedValue(
        new Error(errorMessage),
      );

      // Act & Assert
      await expect(service.execute(1)).rejects.toThrow(errorMessage);
      expect(mockTransaction.begin).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  describe("Use Case: Abandon Without Completing Pages", () => {
    it("should allow user to abandon book after reading only 50 of 300 pages", async () => {
      // Arrange - User read only 50 pages, wants to abandon
      const readingBook = new Book({
        id: 1,
        title: "Not Interesting Book",
        status: BookStatus.READING,
        currentReadingCycle: 1,
        totalPages: 300,
        authorId: 1,
        authorName: "Boring Author",
      });

      const pendingScoreBook = new Book({
        id: 1,
        title: "Not Interesting Book",
        status: BookStatus.PENDING_SCORE,
        currentReadingCycle: 1,
        totalPages: 300,
        authorId: 1,
        authorName: "Boring Author",
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(readingBook)
        .mockResolvedValueOnce(pendingScoreBook);

      // Act - User requests review to then abandon
      const result = await service.execute(1);

      // Assert - Book is now ready for user to review and mark as ABANDONED
      expect(result.status).toBe(BookStatus.PENDING_SCORE);
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          oldStatus: BookStatus.READING,
          newStatus: BookStatus.PENDING_SCORE,
        }),
        mockTransaction,
      );
    });
  });
});
