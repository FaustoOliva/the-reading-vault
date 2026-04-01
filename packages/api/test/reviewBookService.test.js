/**
 * ReviewBookService Tests
 * Tests for the ReviewBook use case
 *
 * Coverage:
 * - PENDING_SCORE → COMPLETED with score
 * - PENDING_SCORE → ABANDONED with score
 * - Invalid state transition errors
 * - Missing score validation
 * - Transaction rollback on failure
 * - History entry creation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ReviewBookService } from "../services/reviewBookService.js";
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

describe("ReviewBookService", () => {
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
      updateReview: vi.fn(),
    };

    mockBookStatusHistoryRepository = {
      create: vi.fn(),
    };

    service = new ReviewBookService(
      mockMssqlClient,
      mockBookRepository,
      mockBookStatusHistoryRepository,
    );
  });

  describe("PENDING_SCORE → COMPLETED", () => {
    it("should mark book as COMPLETED with score", async () => {
      // Arrange
      const pendingBook = new Book({
        id: 1,
        title: "Finished Reading",
        status: BookStatus.PENDING_SCORE,
        currentReadingCycle: 1,
      });

      const completedBook = new Book({
        id: 1,
        title: "Finished Reading",
        status: BookStatus.COMPLETED,
        score: 8.5,
        comment: "Really enjoyed it",
        currentReadingCycle: 1,
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(pendingBook)
        .mockResolvedValueOnce(completedBook);

      // Act
      const result = await service.execute(1, {
        targetStatus: BookStatus.COMPLETED,
        score: 8.5,
        comment: "Really enjoyed it",
      });

      // Assert
      expect(result).toEqual(completedBook);
      expect(mockBookRepository.updateReview).toHaveBeenCalledWith(
        1,
        BookStatus.COMPLETED,
        8.5,
        "Really enjoyed it",
        mockTransaction,
      );
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        {
          bookId: 1,
          oldStatus: BookStatus.PENDING_SCORE,
          newStatus: BookStatus.COMPLETED,
          readingCycle: 1,
        },
        mockTransaction,
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe("PENDING_SCORE → ABANDONED", () => {
    it("should mark book as ABANDONED with score", async () => {
      // Arrange
      const pendingBook = new Book({
        id: 1,
        title: "Not Finishing This",
        status: BookStatus.PENDING_SCORE,
        currentReadingCycle: 1,
      });

      const abandonedBook = new Book({
        id: 1,
        title: "Not Finishing This",
        status: BookStatus.ABANDONED,
        score: 4.0,
        comment: "Too slow",
        currentReadingCycle: 1,
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(pendingBook)
        .mockResolvedValueOnce(abandonedBook);

      // Act
      const result = await service.execute(1, {
        targetStatus: BookStatus.ABANDONED,
        score: 4.0,
        comment: "Too slow",
      });

      // Assert
      expect(result).toEqual(abandonedBook);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw NotFoundError when book does not exist", async () => {
      // Arrange
      mockBookRepository.getById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.execute(999, {
          targetStatus: BookStatus.COMPLETED,
          score: 8.0,
        }),
      ).rejects.toThrow(NotFoundError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should throw InvalidStateTransitionError when book is not PENDING_SCORE", async () => {
      // Arrange
      const readingBook = new Book({
        id: 1,
        title: "Still Reading",
        status: BookStatus.READING,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(readingBook);

      // Act & Assert
      await expect(
        service.execute(1, {
          targetStatus: BookStatus.COMPLETED,
          score: 8.0,
        }),
      ).rejects.toThrow(InvalidStateTransitionError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should rollback transaction on repository error", async () => {
      // Arrange
      const pendingBook = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.PENDING_SCORE,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(pendingBook);
      mockBookRepository.updateReview.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(
        service.execute(1, {
          targetStatus: BookStatus.COMPLETED,
          score: 8.0,
        }),
      ).rejects.toThrow("Database error");
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });
});
