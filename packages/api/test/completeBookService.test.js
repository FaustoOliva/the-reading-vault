/**
 * CompleteBookService Tests
 * Tests for the CompleteBook use case
 * 
 * Coverage:
 * - Valid transitions (WISH_LIST → COMPLETED, READING → COMPLETED)
 * - Invalid transitions (COMPLETED → COMPLETED, ABANDONED → COMPLETED)
 * - Score validation (missing score)
 * - Pages validation (insufficient pages read)
 * - Transaction handling
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BookStatus } from "../models/BookStatus.js";
import { Book } from "../models/Book.js";
import {
  NotFoundError,
  InvalidStateTransitionError,
  MissingScoreError,
  InsufficientPagesError,
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
import { CompleteBookService } from "../services/completeBookService.js";

describe("CompleteBookService", () => {
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
      getConnection: vi.fn().mockResolvedValue({})
    };

    // Create mock repositories
    mockBookRepository = {
      getById: vi.fn(),
      updateToClosedStatus: vi.fn()
    };

    mockReadingSessionRepository = {
      getTotalPagesInCycle: vi.fn()
    };

    mockBookStatusHistoryRepository = {
      create: vi.fn()
    };

    // Instantiate service
    service = new CompleteBookService(
      mockMssqlClient,
      mockBookRepository,
      mockReadingSessionRepository,
      mockBookStatusHistoryRepository
    );
  });

  describe("Book Not Found", () => {
    it("should throw NotFoundError when book does not exist", async () => {
      // Arrange
      const input = { bookId: 999, score: 8.5 };
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
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(300);

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
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(300);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(MissingScoreError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });
  });

  describe("Pages Validation", () => {
    it("should throw InsufficientPagesError when not all pages are read", async () => {
      // Arrange
      const input = { bookId: 1, score: 7.0 };
      const book = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(250); // Only 250 of 300 read

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(InsufficientPagesError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should allow completion when all pages are read", async () => {
      // Arrange
      const input = { bookId: 1, score: 8.5, comment: "Great book!" };
      const book = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1
      });

      const completedBook = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.COMPLETED,
        totalPages: 300,
        currentReadingCycle: 1,
        score: 8.5,
        comment: "Great book!"
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(book)
        .mockResolvedValueOnce(completedBook);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(300);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockTransaction.begin).toHaveBeenCalled();
      expect(mockBookRepository.updateToClosedStatus).toHaveBeenCalledWith(
        1,
        BookStatus.COMPLETED,
        8.5,
        "Great book!",
        mockTransaction
      );
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result.status).toBe(BookStatus.COMPLETED);
    });

    it("should allow completion of legacy books without totalPages", async () => {
      // Arrange
      const input = { bookId: 1, score: 9.0 };
      const book = new Book({
        id: 1,
        title: "Legacy Book",
        status: BookStatus.READING,
        totalPages: null, // Legacy book
        currentReadingCycle: 1
      });

      const completedBook = new Book({
        id: 1,
        title: "Legacy Book",
        status: BookStatus.COMPLETED,
        totalPages: null,
        currentReadingCycle: 1,
        score: 9.0
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(book)
        .mockResolvedValueOnce(completedBook);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(0);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockTransaction.begin).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result.status).toBe(BookStatus.COMPLETED);
    });
  });

  describe("Valid State Transitions", () => {
    it("should complete a book in WISH_LIST status", async () => {
      // Arrange
      const input = { bookId: 1, score: 5.0, comment: "Didn't read, not interested" };
      const book = new Book({
        id: 1,
        title: "Unread Book",
        status: BookStatus.WISH_LIST,
        totalPages: null,
        currentReadingCycle: 1
      });

      const completedBook = new Book({
        id: 1,
        title: "Unread Book",
        status: BookStatus.COMPLETED,
        totalPages: null,
        currentReadingCycle: 1,
        score: 5.0
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(book)
        .mockResolvedValueOnce(completedBook);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(0);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockBookRepository.updateToClosedStatus).toHaveBeenCalledWith(
        1,
        BookStatus.COMPLETED,
        5.0,
        "Didn't read, not interested",
        mockTransaction
      );
      expect(result.status).toBe(BookStatus.COMPLETED);
    });

    it("should complete a book in READING status", async () => {
      // Arrange
      const input = { bookId: 1, score: 9.5 };
      const book = new Book({
        id: 1,
        title: "Great Book",
        status: BookStatus.READING,
        totalPages: 400,
        currentReadingCycle: 1
      });

      const completedBook = new Book({
        id: 1,
        title: "Great Book",
        status: BookStatus.COMPLETED,
        totalPages: 400,
        currentReadingCycle: 1,
        score: 9.5
      });

      mockBookRepository.getById
        .mockResolvedValueOnce(book)
        .mockResolvedValueOnce(completedBook);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(400);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(result.status).toBe(BookStatus.COMPLETED);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe("Invalid State Transitions", () => {
    it("should throw InvalidStateTransitionError when book is already COMPLETED", async () => {
      // Arrange
      const input = { bookId: 1, score: 8.0 };
      const book = new Book({
        id: 1,
        title: "Completed Book",
        status: BookStatus.COMPLETED,
        totalPages: 300,
        currentReadingCycle: 1,
        score: 7.5
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(300);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(InvalidStateTransitionError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should throw InvalidStateTransitionError when book is ABANDONED", async () => {
      // Arrange
      const input = { bookId: 1, score: 8.0 };
      const book = new Book({
        id: 1,
        title: "Abandoned Book",
        status: BookStatus.ABANDONED,
        totalPages: 300,
        currentReadingCycle: 1,
        score: 3.0
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(150);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(InvalidStateTransitionError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });
  });

  describe("Transaction Handling", () => {
    it("should rollback transaction on error", async () => {
      // Arrange
      const input = { bookId: 1, score: 8.0 };
      const book = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.READING,
        totalPages: 300,
        currentReadingCycle: 1
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(300);
      mockBookRepository.updateToClosedStatus.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow("Database error");
      expect(mockTransaction.begin).toHaveBeenCalled();
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });
});
