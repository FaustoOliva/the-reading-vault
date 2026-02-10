/**
 * GetAuthorsService Test Suite
 * Tests for GetAuthors query use case
 * 
 * Pattern: AAA (Arrange-Act-Assert)
 * Target Coverage: ≥ 80%
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetAuthorsService } from "../services/getAuthorsService.js";

describe("GetAuthorsService", () => {
  let service;
  let mockAuthorRepository;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock repository
    mockAuthorRepository = {
      getAll: vi.fn()
    };

    // Instantiate service
    service = new GetAuthorsService(mockAuthorRepository);
  });

  describe("✅ Happy Paths", () => {
    it("should return all authors when no filters provided", async () => {
      // Arrange
      const mockAuthors = [
        { id: 1, name: "Robert C. Martin", nationality: "United States" },
        { id: 2, name: "Martin Fowler", nationality: "United Kingdom" },
        { id: 3, name: "Eric Evans", nationality: "United States" }
      ];

      mockAuthorRepository.getAll.mockResolvedValue(mockAuthors);

      // Act
      const result = await service.execute();

      // Assert
      expect(mockAuthorRepository.getAll).toHaveBeenCalledWith({});
      expect(result).toEqual({ authors: mockAuthors });
    });

    it("should return filtered authors when nameLike filter is provided", async () => {
      // Arrange
      const filters = { nameLike: "Martin" };
      const mockAuthors = [
        { id: 1, name: "Robert C. Martin", nationality: "United States" },
        { id: 2, name: "Martin Fowler", nationality: "United Kingdom" }
      ];

      mockAuthorRepository.getAll.mockResolvedValue(mockAuthors);

      // Act
      const result = await service.execute(filters);

      // Assert
      expect(mockAuthorRepository.getAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual({ authors: mockAuthors });
    });

    it("should return empty array when no authors match filters", async () => {
      // Arrange
      const filters = { nameLike: "NonExistentAuthor" };
      mockAuthorRepository.getAll.mockResolvedValue([]);

      // Act
      const result = await service.execute(filters);

      // Assert
      expect(mockAuthorRepository.getAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual({ authors: [] });
    });

    it("should return authors with null nationality", async () => {
      // Arrange
      const mockAuthors = [
        { id: 1, name: "Unknown Author", nationality: null }
      ];

      mockAuthorRepository.getAll.mockResolvedValue(mockAuthors);

      // Act
      const result = await service.execute();

      // Assert
      expect(result).toEqual({ authors: mockAuthors });
    });
  });

  describe("❌ Error Paths", () => {
    it("should propagate repository errors", async () => {
      // Arrange
      const repositoryError = new Error("Database connection failed");
      mockAuthorRepository.getAll.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(service.execute()).rejects.toThrow("Database connection failed");
    });
  });
});
