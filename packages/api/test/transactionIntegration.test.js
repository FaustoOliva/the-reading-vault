/**
 * Transaction Integration Tests
 * Tests for transaction timeout and deadlock handling
 * 
 * Coverage:
 * - Transaction timeout behavior
 * - Deadlock detection and rollback
 * - Concurrent transaction conflicts
 * - Proper error propagation
 * - Rollback guarantees
 * 
 * Note: These are integration tests that simulate real transaction scenarios.
 * They test the interaction between services, transactions, and error handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import sql from "mssql";
import { LogReadingSessionService } from "../services/logReadingSessionService.js";
import { Book } from "../models/Book.js";
import { BookStatus } from "../models/BookStatus.js";
import { ReadingSession } from "../models/ReadingSession.js";

describe("Transaction Integration Tests", () => {
  let mockMssqlClient;
  let mockBookRepository;
  let mockReadingSessionRepository;
  let mockBookStatusHistoryRepository;
  let service;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMssqlClient = {
      getConnection: vi.fn()
    };

    mockBookRepository = {
      getById: vi.fn(),
      updateStatus: vi.fn()
    };

    mockReadingSessionRepository = {
      getTotalPagesInCycle: vi.fn(),
      create: vi.fn()
    };

    mockBookStatusHistoryRepository = {
      create: vi.fn()
    };

    service = new LogReadingSessionService(
      mockMssqlClient,
      mockBookRepository,
      mockReadingSessionRepository,
      mockBookStatusHistoryRepository
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Transaction Timeout Handling", () => {
    it("should rollback transaction when operation times out", async () => {
      // Arrange
      const mockTransaction = {
        begin: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined)
      };

      const mockPool = {};
      mockMssqlClient.getConnection.mockResolvedValue(mockPool);

      // Mock sql.Transaction constructor
      const originalTransaction = sql.Transaction;
      sql.Transaction = vi.fn(() => mockTransaction);

      const book = new Book({
        id: 1,
        title: "Test Book",
        totalPages: 300,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        abandonedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        readingScore: null
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(50);

      // Simulate timeout error from SQL Server
      const timeoutError = new Error("Timeout: Request failed to complete in 30000ms");
      timeoutError.code = "ETIMEOUT";
      mockReadingSessionRepository.create.mockRejectedValue(timeoutError);

      const input = {
        bookId: 1,
        pagesRead: 50,
        occurredAt: new Date()
      };

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(timeoutError);

      // Verify transaction lifecycle
      expect(mockTransaction.begin).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      expect(mockTransaction.commit).not.toHaveBeenCalled();

      // Restore original
      sql.Transaction = originalTransaction;
    });

    it("should handle multiple concurrent timeout scenarios correctly", async () => {
      // Arrange
      const createMockTransaction = () => ({
        begin: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined)
      });

      const mockTransaction1 = createMockTransaction();
      const mockTransaction2 = createMockTransaction();
      const transactions = [mockTransaction1, mockTransaction2];
      let transactionIndex = 0;

      const mockPool = {};
      mockMssqlClient.getConnection.mockResolvedValue(mockPool);

      const originalTransaction = sql.Transaction;
      sql.Transaction = vi.fn(() => transactions[transactionIndex++]);

      const book = new Book({
        id: 1,
        title: "Test Book",
        totalPages: 300,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        abandonedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        readingScore: null
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(50);

      // First call times out
      const timeoutError = new Error("Timeout");
      timeoutError.code = "ETIMEOUT";
      mockReadingSessionRepository.create
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValueOnce(timeoutError);

      const input = {
        bookId: 1,
        pagesRead: 50,
        occurredAt: new Date()
      };

      // Act - Execute two concurrent operations
      const results = await Promise.allSettled([
        service.execute(input),
        service.execute(input)
      ]);

      // Assert
      expect(results[0].status).toBe("rejected");
      expect(results[1].status).toBe("rejected");

      // Both transactions should rollback
      expect(mockTransaction1.rollback).toHaveBeenCalled();
      expect(mockTransaction2.rollback).toHaveBeenCalled();
      expect(mockTransaction1.commit).not.toHaveBeenCalled();
      expect(mockTransaction2.commit).not.toHaveBeenCalled();

      sql.Transaction = originalTransaction;
    });
  });

  describe("Deadlock Detection and Handling", () => {
    it("should rollback transaction when deadlock is detected", async () => {
      // Arrange
      const mockTransaction = {
        begin: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined)
      };

      const mockPool = {};
      mockMssqlClient.getConnection.mockResolvedValue(mockPool);

      const originalTransaction = sql.Transaction;
      sql.Transaction = vi.fn(() => mockTransaction);

      const book = new Book({
        id: 1,
        title: "Test Book",
        totalPages: 300,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        abandonedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        readingScore: null
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(50);

      // Simulate SQL Server deadlock error (Error 1205)
      const deadlockError = new Error("Transaction was deadlocked");
      deadlockError.code = "EREQUEST";
      deadlockError.number = 1205; // SQL Server deadlock error number
      mockReadingSessionRepository.create.mockRejectedValue(deadlockError);

      const input = {
        bookId: 1,
        pagesRead: 50,
        occurredAt: new Date()
      };

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(deadlockError);

      // Verify transaction was rolled back
      expect(mockTransaction.begin).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      expect(mockTransaction.commit).not.toHaveBeenCalled();

      sql.Transaction = originalTransaction;
    });

    it("should handle deadlock in status update operation", async () => {
      // Arrange
      const mockTransaction = {
        begin: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined)
      };

      const mockPool = {};
      mockMssqlClient.getConnection.mockResolvedValue(mockPool);

      const originalTransaction = sql.Transaction;
      sql.Transaction = vi.fn(() => mockTransaction);

      const book = new Book({
        id: 1,
        title: "Test Book",
        totalPages: 300,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        abandonedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        readingScore: null
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(250);

      // Session creation succeeds
      const mockSession = new ReadingSession({
        id: 1,
        bookId: 1,
        pagesRead: 50,
        readingCycle: 1,
        occurredAt: new Date()
      });
      mockReadingSessionRepository.create.mockResolvedValue(mockSession);

      // Deadlock happens during status update (transition scenario)
      const deadlockError = new Error("Transaction deadlock");
      deadlockError.code = "EREQUEST";
      deadlockError.number = 1205;
      mockBookRepository.updateStatus.mockRejectedValue(deadlockError);

      const input = {
        bookId: 1,
        pagesRead: 50,
        occurredAt: new Date()
      };

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(deadlockError);

      // Verify rollback occurred even though first operation succeeded
      expect(mockTransaction.begin).toHaveBeenCalledTimes(1);
      expect(mockReadingSessionRepository.create).toHaveBeenCalled();
      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      expect(mockTransaction.commit).not.toHaveBeenCalled();

      sql.Transaction = originalTransaction;
    });
  });

  describe("Transaction Lock Timeout", () => {
    it("should handle lock timeout when waiting for resource", async () => {
      // Arrange
      const mockTransaction = {
        begin: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined)
      };

      const mockPool = {};
      mockMssqlClient.getConnection.mockResolvedValue(mockPool);

      const originalTransaction = sql.Transaction;
      sql.Transaction = vi.fn(() => mockTransaction);

      const book = new Book({
        id: 1,
        title: "Test Book",
        totalPages: 300,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        abandonedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        readingScore: null
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(50);

      // Simulate lock timeout (SQL Server error 1222)
      const lockTimeoutError = new Error("Lock request timeout period exceeded");
      lockTimeoutError.code = "EREQUEST";
      lockTimeoutError.number = 1222;
      mockReadingSessionRepository.create.mockRejectedValue(lockTimeoutError);

      const input = {
        bookId: 1,
        pagesRead: 50,
        occurredAt: new Date()
      };

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(lockTimeoutError);

      // Verify proper rollback
      expect(mockTransaction.begin).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      expect(mockTransaction.commit).not.toHaveBeenCalled();

      sql.Transaction = originalTransaction;
    });
  });

  describe("Transaction Rollback Guarantees", () => {
    it("should rollback on any error during transaction", async () => {
      // Arrange
      const mockTransaction = {
        begin: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined)
      };

      const mockPool = {};
      mockMssqlClient.getConnection.mockResolvedValue(mockPool);

      const originalTransaction = sql.Transaction;
      sql.Transaction = vi.fn(() => mockTransaction);

      const book = new Book({
        id: 1,
        title: "Test Book",
        totalPages: 300,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        abandonedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        readingScore: null
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(50);

      // Generic database error
      const databaseError = new Error("Constraint violation");
      mockReadingSessionRepository.create.mockRejectedValue(databaseError);

      const input = {
        bookId: 1,
        pagesRead: 50,
        occurredAt: new Date()
      };

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(databaseError);

      // Verify rollback guarantees
      expect(mockTransaction.begin).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
      expect(mockTransaction.commit).not.toHaveBeenCalled();

      sql.Transaction = originalTransaction;
    });

    it("should not commit if rollback fails", async () => {
      // Arrange
      const mockTransaction = {
        begin: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockRejectedValue(new Error("Rollback failed"))
      };

      const mockPool = {};
      mockMssqlClient.getConnection.mockResolvedValue(mockPool);

      const originalTransaction = sql.Transaction;
      sql.Transaction = vi.fn(() => mockTransaction);

      const book = new Book({
        id: 1,
        title: "Test Book",
        totalPages: 300,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        abandonedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        readingScore: null
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(50);

      const originalError = new Error("Operation failed");
      mockReadingSessionRepository.create.mockRejectedValue(originalError);

      const input = {
        bookId: 1,
        pagesRead: 50,
        occurredAt: new Date()
      };

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow();

      // Verify commit was never called
      expect(mockTransaction.commit).not.toHaveBeenCalled();
      expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);

      sql.Transaction = originalTransaction;
    });
  });

  describe("Concurrent Transaction Conflicts", () => {
    it("should handle concurrent modifications to same resource", async () => {
      // Arrange
      const createMockTransaction = () => ({
        begin: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined)
      });

      const mockTransaction1 = createMockTransaction();
      const mockTransaction2 = createMockTransaction();
      const transactions = [mockTransaction1, mockTransaction2];
      let transactionIndex = 0;

      const mockPool = {};
      mockMssqlClient.getConnection.mockResolvedValue(mockPool);

      const originalTransaction = sql.Transaction;
      sql.Transaction = vi.fn(() => transactions[transactionIndex++]);

      const book = new Book({
        id: 1,
        title: "Test Book",
        totalPages: 300,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        abandonedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        readingScore: null
      });

      mockBookRepository.getById.mockResolvedValue(book);
      mockReadingSessionRepository.getTotalPagesInCycle.mockResolvedValue(50);

      // First transaction succeeds
      const mockSession1 = new ReadingSession({
        id: 1,
        bookId: 1,
        pagesRead: 50,
        readingCycle: 1,
        occurredAt: new Date()
      });

      // Second transaction conflicts (simulating concurrent modification)
      const conflictError = new Error("Resource locked by another transaction");
      conflictError.code = "EREQUEST";
      conflictError.number = 1222; // Lock timeout

      mockReadingSessionRepository.create
        .mockResolvedValueOnce(mockSession1)
        .mockRejectedValueOnce(conflictError);

      const input = {
        bookId: 1,
        pagesRead: 50,
        occurredAt: new Date()
      };

      // Act
      const results = await Promise.allSettled([
        service.execute(input),
        service.execute(input)
      ]);

      // Assert
      // One should succeed, one should fail
      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");

      // First transaction commits
      expect(mockTransaction1.commit).toHaveBeenCalled();
      expect(mockTransaction1.rollback).not.toHaveBeenCalled();

      // Second transaction rolls back
      expect(mockTransaction2.rollback).toHaveBeenCalled();
      expect(mockTransaction2.commit).not.toHaveBeenCalled();

      sql.Transaction = originalTransaction;
    });
  });
});
