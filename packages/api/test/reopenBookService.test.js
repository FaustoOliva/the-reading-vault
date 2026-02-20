/**
 * ReopenBookService Tests
 * Tests for the ReopenBook use case
 * 
 * Coverage:
 * - ABANDONED → READING transition
 * - Cycle increment
 * - Invalid state transition errors
 * - History entry creation
 * - Transaction rollback on failure
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ReopenBookService } from "../services/reopenBookService.js";
import { Book } from "../models/Book.js";
import { BookStatus } from "../models/BookStatus.js";
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

describe("ReopenBookService", () => {
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

    service = new ReopenBookService(
      mockMssqlClient,
      mockBookRepository,
      mockBookStatusHistoryRepository
    );
  });

  describe("ABANDONED → READING", () => {
    it("should reopen an ABANDONED book and increment cycle", async () => {
      // Arrange
      const abandonedBook = new Book({
        id: 1,
        title: "Previously Abandoned",
        status: BookStatus.ABANDONED,
        currentReadingCycle: 2,
        score: 5.0,
        comment: "Gave up on this",
      });

      const reopenedBook = new Book({
        id: 1,
        title: "Previously Abandoned",
        status: BookStatus.READING,
        currentReadingCycle: 3,
        score: 5.0,
        comment: "Gave up on this",
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(abandonedBook)
        .mockResolvedValueOnce(reopenedBook);

      // Act
      const result = await service.execute(1);

      // Assert
      expect(result).toEqual(reopenedBook);
      expect(mockBookRepository.updateStatus).toHaveBeenCalledWith(
        1,
        BookStatus.READING,
        3, // New cycle = 2 + 1
        mockTransaction
      );
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        {
          bookId: 1,
          oldStatus: BookStatus.ABANDONED,
          newStatus: BookStatus.READING,
          readingCycle: 3,
        },
        mockTransaction
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw NotFoundError when book does not exist", async () => {
      // Arrange
      mockBookRepository.getById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute(999)).rejects.toThrow(NotFoundError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should throw InvalidStateTransitionError when book is not ABANDONED", async () => {
      // Arrange
      const readingBook = new Book({
        id: 1,
        title: "Currently Reading",
        status: BookStatus.READING,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(readingBook);

      // Act & Assert
      await expect(service.execute(1)).rejects.toThrow(
        InvalidStateTransitionError
      );
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should throw InvalidStateTransitionError when book is COMPLETED", async () => {
      // Arrange
      const completedBook = new Book({
        id: 1,
        title: "Finished Book",
        status: BookStatus.COMPLETED,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(completedBook);

      // Act & Assert
      await expect(service.execute(1)).rejects.toThrow(
        InvalidStateTransitionError
      );
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should rollback transaction on repository error", async () => {
      // Arrange
      const abandonedBook = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.ABANDONED,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(abandonedBook);
      mockBookRepository.updateStatus.mockRejectedValue(
        new Error("Database error")
      );

      // Act & Assert
      await expect(service.execute(1)).rejects.toThrow("Database error");
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });
});
