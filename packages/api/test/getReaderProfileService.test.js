/**
 * GetReaderProfileService Test Suite
 * Tests aligned with profile minimum requirement and recommendation-time refresh rules.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetReaderProfileService } from "../services/getReaderProfileService.js";

describe("GetReaderProfileService", () => {
  let service;
  let mockAIContextRepository;
  let mockOpenAIClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAIContextRepository = {
      getReaderProfile: vi.fn(),
      countBooksForProfileRequirement: vi.fn(),
      calculateReaderProfile: vi.fn(),
      refreshReaderProfile: vi.fn(),
      markImportantEventPending: vi.fn(),
    };

    mockOpenAIClient = {
      generateProfileSummary: vi.fn(),
    };

    service = new GetReaderProfileService(
      mockAIContextRepository,
      mockOpenAIClient,
    );
  });

  describe("execute", () => {
    it("returns existing profile without refresh when recommendation refresh conditions are not met", async () => {
      const profile = {
        id: 1,
        version: 2,
        profileData: { statistics: { completedBooks: 4, abandonedBooks: 1 } },
        semanticSummary: "Summary",
        lastUpdated: new Date(),
        importantEventPending: false,
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(profile);

      const result = await service.execute({
        createIfEligible: true,
        refreshForRecommendations: true,
      });

      expect(result).toEqual(profile);
      expect(
        mockAIContextRepository.refreshReaderProfile,
      ).not.toHaveBeenCalled();
    });

    it("creates profile when missing and minimum requirement is met", async () => {
      mockAIContextRepository.getReaderProfile.mockResolvedValue(null);
      mockAIContextRepository.countBooksForProfileRequirement.mockResolvedValue(
        5,
      );
      mockAIContextRepository.calculateReaderProfile.mockResolvedValue({
        statistics: { completedBooks: 4, abandonedBooks: 1 },
      });
      mockOpenAIClient.generateProfileSummary.mockResolvedValue({
        summary: "Generated summary",
        tokensUsed: 120,
      });
      mockAIContextRepository.refreshReaderProfile.mockResolvedValue({
        version: 1,
        profileData: { statistics: { completedBooks: 4, abandonedBooks: 1 } },
        semanticSummary: "Generated summary",
        tokensUsed: 120,
      });

      const result = await service.execute({ createIfEligible: true });

      expect(result).not.toBeNull();
      expect(mockAIContextRepository.refreshReaderProfile).toHaveBeenCalledWith(
        "initial_profile",
        "Generated summary",
        120,
      );
    });

    it("does not create profile when missing and requirement is not met", async () => {
      mockAIContextRepository.getReaderProfile.mockResolvedValue(null);
      mockAIContextRepository.countBooksForProfileRequirement.mockResolvedValue(
        3,
      );

      const result = await service.execute({ createIfEligible: true });

      expect(result).toBeNull();
      expect(
        mockAIContextRepository.refreshReaderProfile,
      ).not.toHaveBeenCalled();
    });

    it("refreshes on recommendations only when stale and important event is pending", async () => {
      const staleProfile = {
        id: 1,
        version: 2,
        profileData: { statistics: { completedBooks: 5, abandonedBooks: 1 } },
        semanticSummary: "Old summary",
        lastUpdated: new Date(Date.now() - 25 * 60 * 60 * 1000),
        importantEventPending: true,
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(staleProfile);
      mockAIContextRepository.calculateReaderProfile.mockResolvedValue({
        statistics: { completedBooks: 5, abandonedBooks: 1 },
      });
      mockOpenAIClient.generateProfileSummary.mockResolvedValue({
        summary: "New summary",
        tokensUsed: 90,
      });
      mockAIContextRepository.refreshReaderProfile.mockResolvedValue({
        version: 3,
        profileData: { statistics: { completedBooks: 5, abandonedBooks: 1 } },
        semanticSummary: "New summary",
        tokensUsed: 90,
      });

      const result = await service.execute({ refreshForRecommendations: true });

      expect(result.version).toBe(3);
      expect(result.importantEventPending).toBe(false);
      expect(mockAIContextRepository.refreshReaderProfile).toHaveBeenCalledWith(
        "recommendations_sync",
        "New summary",
        90,
      );
    });
  });

  describe("event registration", () => {
    it("marks important event when event is book_completed", async () => {
      const result = await service.refreshIfNeeded({
        event: "book_completed",
        bookId: 10,
      });

      expect(result).toEqual({ refreshed: false, marked: true });
      expect(
        mockAIContextRepository.markImportantEventPending,
      ).toHaveBeenCalledTimes(1);
    });

    it("does not mark event for non-important events", async () => {
      const result = await service.refreshIfNeeded({ event: "session_logged" });

      expect(result).toEqual({ refreshed: false, marked: false });
      expect(
        mockAIContextRepository.markImportantEventPending,
      ).not.toHaveBeenCalled();
    });
  });

  describe("_isProfileStale", () => {
    it("supports both camelCase and snake_case timestamp fields", () => {
      const camelCaseProfile = {
        lastUpdated: new Date(Date.now() - 25 * 60 * 60 * 1000),
      };
      const snakeCaseProfile = {
        last_updated: new Date(Date.now() - 25 * 60 * 60 * 1000),
      };

      expect(service._isProfileStale(camelCaseProfile)).toBe(true);
      expect(service._isProfileStale(snakeCaseProfile)).toBe(true);
    });
  });
});
