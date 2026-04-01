/**
 * GetCountriesService Test Suite
 * Tests for GetCountries query use case
 *
 * Pattern: AAA (Arrange-Act-Assert)
 * Target Coverage: ≥ 80%
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetCountriesService } from "../services/getCountriesService.js";

describe("GetCountriesService", () => {
  let service;
  let mockCountryRepository;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock repository
    mockCountryRepository = {
      getAll: vi.fn(),
    };

    // Instantiate service
    service = new GetCountriesService(mockCountryRepository);
  });

  describe("✅ Happy Paths", () => {
    it("should return all countries when no filters provided", async () => {
      // Arrange
      const mockCountries = [
        { id: 1, name: "United States" },
        { id: 2, name: "United Kingdom" },
        { id: 3, name: "Canada" },
        { id: 4, name: "France" },
      ];

      mockCountryRepository.getAll.mockResolvedValue(mockCountries);

      // Act
      const result = await service.execute();

      // Assert
      expect(mockCountryRepository.getAll).toHaveBeenCalledWith({});
      expect(result).toEqual({ countries: mockCountries });
    });

    it("should return filtered countries when nameLike filter is provided", async () => {
      // Arrange
      const filters = { nameLike: "United" };
      const mockCountries = [
        { id: 1, name: "United States" },
        { id: 2, name: "United Kingdom" },
      ];

      mockCountryRepository.getAll.mockResolvedValue(mockCountries);

      // Act
      const result = await service.execute(filters);

      // Assert
      expect(mockCountryRepository.getAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual({ countries: mockCountries });
    });

    it("should return empty array when no countries match filters", async () => {
      // Arrange
      const filters = { nameLike: "NonExistentCountry" };
      mockCountryRepository.getAll.mockResolvedValue([]);

      // Act
      const result = await service.execute(filters);

      // Assert
      expect(mockCountryRepository.getAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual({ countries: [] });
    });

    it("should handle partial name matches", async () => {
      // Arrange
      const filters = { nameLike: "Stat" };
      const mockCountries = [{ id: 1, name: "United States" }];

      mockCountryRepository.getAll.mockResolvedValue(mockCountries);

      // Act
      const result = await service.execute(filters);

      // Assert
      expect(mockCountryRepository.getAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual({ countries: mockCountries });
    });
  });

  describe("❌ Error Paths", () => {
    it("should propagate repository errors", async () => {
      // Arrange
      const repositoryError = new Error("Database connection failed");
      mockCountryRepository.getAll.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(service.execute()).rejects.toThrow(
        "Database connection failed",
      );
    });
  });
});
