/**
 * GetBooksService Test Suite
 * Tests for GetBooks query use case
 * 
 * Pattern: AAA (Arrange-Act-Assert)
 * Target Coverage: ≥ 80%
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetBooksService } from "../services/getBooksService.js";
import { Book } from "../models/Book.js";
import { BookStatus } from "../models/BookStatus.js";

describe("GetBooksService", () => {
  let service;
  let mockBookRepository;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock repository
    mockBookRepository = {
      getAll: vi.fn()
    };

    // Instantiate service
    service = new GetBooksService(mockBookRepository);
  });

  describe("✅ Happy Paths", () => {
    it("should return paginated books when no filters provided", async () => {
      // Arrange
      const mockBooks = [
        new Book({
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
          comment: null
        }),
        new Book({
          id: 2,
          title: "Domain-Driven Design",
          isbn: "9780321125217",
          authorId: 2,
          authorName: "Eric Evans",
          authorNationality: "United States",
          totalPages: 560,
          status: BookStatus.WISH_LIST,
          currentReadingCycle: 1,
          score: null,
          comment: null
        })
      ];

      const mockResult = {
        books: mockBooks,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockBookRepository.getAll.mockResolvedValue(mockResult);

      // Act
      const result = await service.execute();

      // Assert
      expect(mockBookRepository.getAll).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
    });

    it("should return filtered books by status", async () => {
      // Arrange
      const filters = { status: BookStatus.READING };
      const pagination = { page: 1, limit: 10 };
      
      const mockBooks = [
        new Book({
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
          comment: null
        })
      ];

      const mockResult = {
        books: mockBooks,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockBookRepository.getAll.mockResolvedValue(mockResult);

      // Act
      const result = await service.execute(filters, pagination);

      // Assert
      expect(mockBookRepository.getAll).toHaveBeenCalledWith(filters, pagination);
      expect(result).toEqual(mockResult);
    });

    it("should return filtered books by authorId", async () => {
      // Arrange
      const filters = { authorId: 1 };
      const pagination = { page: 1, limit: 10 };
      
      const mockBooks = [
        new Book({
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
          comment: null
        }),
        new Book({
          id: 2,
          title: "The Clean Coder",
          isbn: "9780137081073",
          authorId: 1,
          authorName: "Robert C. Martin",
          authorNationality: "United States",
          totalPages: 256,
          status: BookStatus.COMPLETED,
          currentReadingCycle: 1,
          score: 5,
          comment: "Excellent book!"
        })
      ];

      const mockResult = {
        books: mockBooks,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockBookRepository.getAll.mockResolvedValue(mockResult);

      // Act
      const result = await service.execute(filters, pagination);

      // Assert
      expect(mockBookRepository.getAll).toHaveBeenCalledWith(filters, pagination);
      expect(result).toEqual(mockResult);
    });

    it("should return books with custom pagination", async () => {
      // Arrange
      const filters = {};
      const pagination = { page: 2, limit: 5 };
      
      const mockBooks = [
        new Book({
          id: 6,
          title: "Refactoring",
          isbn: "9780134757599",
          authorId: 3,
          authorName: "Martin Fowler",
          authorNationality: "United Kingdom",
          totalPages: 448,
          status: BookStatus.WISH_LIST,
          currentReadingCycle: 1,
          score: null,
          comment: null
        })
      ];

      const mockResult = {
        books: mockBooks,
        total: 10,
        page: 2,
        limit: 5,
        totalPages: 2
      };

      mockBookRepository.getAll.mockResolvedValue(mockResult);

      // Act
      const result = await service.execute(filters, pagination);

      // Assert
      expect(mockBookRepository.getAll).toHaveBeenCalledWith(filters, pagination);
      expect(result).toEqual(mockResult);
    });

    it("should return empty array when no books match filters", async () => {
      // Arrange
      const filters = { status: BookStatus.ABANDONED };
      const mockResult = {
        books: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      };

      mockBookRepository.getAll.mockResolvedValue(mockResult);

      // Act
      const result = await service.execute(filters);

      // Assert
      expect(mockBookRepository.getAll).toHaveBeenCalledWith(filters, { page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
    });

    it("should combine multiple filters", async () => {
      // Arrange
      const filters = { status: BookStatus.READING, authorId: 1 };
      const pagination = { page: 1, limit: 10 };
      
      const mockBooks = [
        new Book({
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
          comment: null
        })
      ];

      const mockResult = {
        books: mockBooks,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockBookRepository.getAll.mockResolvedValue(mockResult);

      // Act
      const result = await service.execute(filters, pagination);

      // Assert
      expect(mockBookRepository.getAll).toHaveBeenCalledWith(filters, pagination);
      expect(result).toEqual(mockResult);
    });
  });

  describe("❌ Error Paths", () => {
    it("should propagate repository errors", async () => {
      // Arrange
      const repositoryError = new Error("Database connection failed");
      mockBookRepository.getAll.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(service.execute()).rejects.toThrow("Database connection failed");
    });
  });
});
