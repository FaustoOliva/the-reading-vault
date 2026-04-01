/**
 * GetGenresService Test Suite
 * Tests for GetGenres query use case
 *
 * Pattern: AAA (Arrange-Act-Assert)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetGenresService } from "../services/getGenresService.js";

describe("GetGenresService", () => {
  let service;
  let mockGenresRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGenresRepository = {
      getAll: vi.fn(),
    };

    service = new GetGenresService(mockGenresRepository);
  });

  describe("Happy paths", () => {
    it("returns all genres sorted by repository", async () => {
      const mockGenres = [
        { id: 2, name: "Fantasy" },
        { id: 7, name: "Historical Fiction" },
        { id: 10, name: "Sci-Fi" },
      ];
      mockGenresRepository.getAll.mockResolvedValue(mockGenres);

      const result = await service.execute();

      expect(mockGenresRepository.getAll).toHaveBeenCalledWith();
      expect(result).toEqual({ genres: mockGenres });
    });

    it("returns empty list when there are no genres", async () => {
      mockGenresRepository.getAll.mockResolvedValue([]);

      const result = await service.execute();

      expect(result).toEqual({ genres: [] });
    });
  });

  describe("Error paths", () => {
    it("propagates repository errors", async () => {
      mockGenresRepository.getAll.mockRejectedValue(
        new Error("Database unavailable"),
      );

      await expect(service.execute()).rejects.toThrow("Database unavailable");
    });
  });
});
