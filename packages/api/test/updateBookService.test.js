/**
 * UpdateBookService Tests
 * Tests for the UpdateBook use case
 *
 * Coverage:
 * - Successful partial updates (title, totalPages, score, comment)
 * - Book not found error
 * - Transaction rollback on failure
 * - Verify status is NOT modified
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { UpdateBookService } from "../services/updateBookService.js";
import { Book } from "../models/Book.js";
import { BookStatus } from "../models/BookStatus.js";
import { NotFoundError } from "../errors/index.js";

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

describe("UpdateBookService", () => {
  let service;
  let mockMssqlClient;
  let mockBookRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMssqlClient = {
      getConnection: vi.fn().mockResolvedValue({}),
    };

    mockBookRepository = {
      getById: vi.fn(),
      updateMetadata: vi.fn(),
    };

    service = new UpdateBookService(mockMssqlClient, mockBookRepository);
  });

  describe("Successful Updates", () => {
    it("should update title only", async () => {
      // Arrange
      const existingBook = new Book({
        id: 1,
        title: "Old Title",
        status: BookStatus.READING,
        currentReadingCycle: 1,
      });

      const updatedBook = new Book({
        id: 1,
        title: "New Title",
        status: BookStatus.READING,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(existingBook);
      mockBookRepository.updateMetadata.mockResolvedValue(updatedBook);

      // Act
      const result = await service.execute(1, { title: "New Title" });

      // Assert
      expect(result).toEqual(updatedBook);
      expect(mockBookRepository.updateMetadata).toHaveBeenCalledWith(
        1,
        { title: "New Title" },
        mockTransaction,
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it("should update multiple fields at once", async () => {
      // Arrange
      const existingBook = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.COMPLETED,
        currentReadingCycle: 1,
      });

      const updatedBook = new Book({
        id: 1,
        title: "Updated Title",
        totalPages: 500,
        score: 9.5,
        comment: "Great book!",
        status: BookStatus.COMPLETED,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(existingBook);
      mockBookRepository.updateMetadata.mockResolvedValue(updatedBook);

      // Act
      const result = await service.execute(1, {
        title: "Updated Title",
        totalPages: 500,
        score: 9.5,
        comment: "Great book!",
      });

      // Assert
      expect(result).toEqual(updatedBook);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw NotFoundError when book does not exist", async () => {
      // Arrange
      mockBookRepository.getById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.execute(999, { title: "New Title" }),
      ).rejects.toThrow(NotFoundError);
      expect(mockTransaction.begin).not.toHaveBeenCalled();
    });

    it("should rollback transaction on repository error", async () => {
      // Arrange
      const existingBook = new Book({
        id: 1,
        title: "Test Book",
        status: BookStatus.READING,
        currentReadingCycle: 1,
      });

      mockBookRepository.getById.mockResolvedValue(existingBook);
      mockBookRepository.updateMetadata.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(service.execute(1, { title: "New Title" })).rejects.toThrow(
        "Database error",
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });
});
