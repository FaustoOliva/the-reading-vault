/**
 * AbandonBookService Tests
 * Tests for the AbandonBook use case
 * 
 * Coverage:
 * - Valid transitions (WISH_LIST → ABANDONED, READING → ABANDONED)
 * - Invalid transitions (COMPLETED → ABANDONED, ABANDONED → ABANDONED)
 * - Score validation (missing score)
 * - Transaction handling
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BookStatus } from "../models/BookStatus.js";
import { Book } from "../models/Book.js";
import {
  NotFoundError,
  InvalidStateTransitionError,
  MissingScoreError,
} from "../errors/index.js";

// Mock transaction (must be defined before vi.mock)
const mockTransaction = {
  begin: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
  request: vi.fn().mockReturnThis()
};

// Mock mssql module (must be hoisted)
vi.mock("mssql", () => ({
  default: {
    Transaction: vi.fn(() => mockTransaction)
  }
}));

// Import service AFTER mocks are set up
import { AbandonBookService } from "../services/abandonBookService.js";

describe("AbandonBookService", () => {
  let service;
  let mockMssqlClient;
  let mockBookRepository;
  let mockBookStatusHistoryRepository;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock MSSQL client
    mockMssqlClient = {
      getConnection: vi.fn().mockResolvedValue({})
    };

    // Create mock repositories
    mockBookRepository = {
      getById: vi.fn(),
      updateToClosedStatus: vi.fn()
    };

    mockBookStatusHistoryRepository = {
      create: vi.fn()
    };

    // Instantiate service
    service = new AbandonBookService(
      mockMssqlClient,
      mockBookRepository,
      mockBookStatusHistoryRepository
    );
  });

  describe("Book Not Found", () => {
    it("should throw NotFoundError when book does not exist", async () => {
      // Arrange
      const input = { bookId: 999, score: 2.0 };
      mockBookRepository.getById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(NotFoundError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });
  });

  describe("Score Validation", () => {
    it("should throw MissingScoreError when score is null", async () => {
      // Arrange
      const input = { bookId: 1, score: null };
      const book = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1
      });

      mockBookRepository.getById.mockResolvedValue(book);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(MissingScoreError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should throw MissingScoreError when score is undefined", async () => {
      // Arrange
      const input = { bookId: 1 }; // score is undefined
      const book = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1
      });

      mockBookRepository.getById.mockResolvedValue(book);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(MissingScoreError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });
  });

  describe("Valid State Transitions", () => {
    it("should abandon a book in WISH_LIST status", async () => {
      // Arrange
      const input = { bookId: 1, score: 3.0, comment: "Not interested anymore" };
      const book = new Book({
        id: 1,
        title: "Unread Book",
        status: BookStatus.WISH_LIST,
        totalPages: 400,
        currentReadingCycle: 1
      });

      const abandonedBook = new Book({
        id: 1,
        title: "Unread Book",
        status: BookStatus.ABANDONED,
        totalPages: 400,
        currentReadingCycle: 1,
        score: 3.0,
        comment: "Not interested anymore"
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(book)
        .mockResolvedValueOnce(abandonedBook);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockTransaction.begin).toHaveBeenCalled();
      expect(mockBookRepository.updateToClosedStatus).toHaveBeenCalledWith(
        1,
        BookStatus.ABANDONED,
        3.0,
        "Not interested anymore",
        mockTransaction
      );
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        {
          bookId: 1,
          oldStatus: BookStatus.WISH_LIST,
          newStatus: BookStatus.ABANDONED,
          readingCycle: 1
        },
        mockTransaction
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result.status).toBe(BookStatus.ABANDONED);
    });

    it("should abandon a book in READING status", async () => {
      // Arrange
      const input = { bookId: 1, score: 4.0, comment: "Too boring" };
      const book = new Book({
        id: 1,
        title: "Boring Book",
        status: BookStatus.READING,
        totalPages: 500,
        currentReadingCycle: 1
      });

      const abandonedBook = new Book({
        id: 1,
        title: "Boring Book",
        status: BookStatus.ABANDONED,
        totalPages: 500,
        currentReadingCycle: 1,
        score: 4.0,
        comment: "Too boring"
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(book)
        .mockResolvedValueOnce(abandonedBook);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockBookRepository.updateToClosedStatus).toHaveBeenCalledWith(
        1,
        BookStatus.ABANDONED,
        4.0,
        "Too boring",
        mockTransaction
      );
      expect(result.status).toBe(BookStatus.ABANDONED);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it("should abandon a book without comment", async () => {
      // Arrange
      const input = { bookId: 1, score: 2.5 };
      const book = new Book({
        id: 1,
        title: "Bad Book",
        status: BookStatus.READING,
        totalPages: 200,
        currentReadingCycle: 1
      });

      const abandonedBook = new Book({
        id: 1,
        title: "Bad Book",
        status: BookStatus.ABANDONED,
        totalPages: 200,
        currentReadingCycle: 1,
        score: 2.5
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(book)
        .mockResolvedValueOnce(abandonedBook);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockBookRepository.updateToClosedStatus).toHaveBeenCalledWith(
        1,
        BookStatus.ABANDONED,
        2.5,
        undefined,
        mockTransaction
      );
      expect(result.status).toBe(BookStatus.ABANDONED);
    });
  });

  describe("Invalid State Transitions", () => {
    it("should throw InvalidStateTransitionError when book is already ABANDONED", async () => {
      // Arrange
      const input = { bookId: 1, score: 1.0 };
      const book = new Book({
        id: 1,
        title: "Already Abandoned",
        status: BookStatus.ABANDONED,
        totalPages: 300,
        currentReadingCycle: 1,
        score: 2.0
      });

      mockBookRepository.getById.mockResolvedValue(book);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(InvalidStateTransitionError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should throw InvalidStateTransitionError when book is COMPLETED", async () => {
      // Arrange
      const input = { bookId: 1, score: 1.0 };
      const book = new Book({
        id: 1,
        title: "Completed Book",
        status: BookStatus.COMPLETED,
        totalPages: 300,
        currentReadingCycle: 1,
        score: 9.0
      });

      mockBookRepository.getById.mockResolvedValue(book);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(InvalidStateTransitionError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });
  });

  describe("Transaction Handling", () => {
    it("should rollback transaction on error", async () => {
      // Arrange
      const input = { bookId: 1, score: 5.0 };
      const book = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockBookRepository.updateToClosedStatus.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow("Database error");
      expect(mockTransaction.begin).toHaveBeenCalled();
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });
});
