/**
 * GetReaderProfileService Test Suite
 * Tests for intelligent profile refresh logic
 *
 * Pattern: AAA (Arrange-Act-Assert)
 * Target Coverage: ≥ 80%
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
      calculateReaderProfile: vi.fn(),
      refreshReaderProfile: vi.fn(),
      _detectTopAuthorsChange: vi.fn(),
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
    it("should return cached profile if fresh (<24h)", async () => {
      // Arrange
      const freshProfile = {
        id: 1,
        version: 3,
        profile_data: JSON.stringify({ statistics: { totalBooks: 10 } }),
        semantic_summary: "Test summary",
        last_updated: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        last_refresh_reason: "book_completed",
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(freshProfile);

      // Act
      const result = await service.execute();

      // Assert
      expect(mockAIContextRepository.getReaderProfile).toHaveBeenCalled();
      expect(
        mockAIContextRepository.refreshReaderProfile,
      ).not.toHaveBeenCalled();
      expect(result).toEqual(freshProfile);
    });

    it("should refresh profile if missing", async () => {
      // Arrange
      mockAIContextRepository.getReaderProfile.mockResolvedValue(null);
      mockAIContextRepository.refreshReaderProfile.mockResolvedValue({
        version: 1,
        profileData: { statistics: { totalBooks: 0 } },
        semanticSummary: "Initial profile",
        tokensUsed: 150,
      });

      const newProfile = {
        id: 1,
        version: 1,
        profile_data: JSON.stringify({ statistics: { totalBooks: 0 } }),
        semantic_summary: "Initial profile",
        last_updated: new Date(),
        last_refresh_reason: "initial_profile",
      };

      mockAIContextRepository.getReaderProfile
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newProfile);

      // Act
      const result = await service.execute();

      // Assert
      expect(mockAIContextRepository.refreshReaderProfile).toHaveBeenCalledWith(
        "initial_profile",
      );
      expect(result).toEqual(newProfile);
    });

    it("should refresh profile if stale (>24h)", async () => {
      // Arrange
      const staleProfile = {
        id: 1,
        version: 2,
        profile_data: JSON.stringify({ statistics: { totalBooks: 5 } }),
        semantic_summary: "Old summary",
        last_updated: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
        last_refresh_reason: "book_completed",
      };

      mockAIContextRepository.getReaderProfile
        .mockResolvedValueOnce(staleProfile)
        .mockResolvedValueOnce({
          ...staleProfile,
          version: 3,
          last_updated: new Date(),
          last_refresh_reason: "stale_profile",
        });

      mockAIContextRepository.refreshReaderProfile.mockResolvedValue({
        version: 3,
        profileData: { statistics: { totalBooks: 5 } },
        semanticSummary: "Refreshed summary",
        tokensUsed: 200,
      });

      // Act
      const result = await service.execute();

      // Assert
      expect(mockAIContextRepository.refreshReaderProfile).toHaveBeenCalledWith(
        "stale_profile",
      );
      expect(result.version).toBe(3);
    });

    it("should not refresh if profile is fresh (<24h)", async () => {
      // Arrange
      const currentTime = new Date();
      const freshProfile = {
        id: 1,
        version: 5,
        profile_data: JSON.stringify({ statistics: { totalBooks: 15 } }),
        semantic_summary: "Current summary",
        last_updated: new Date(currentTime.getTime() - 20 * 60 * 60 * 1000), // 20 hours ago
        last_refresh_reason: "book_abandoned",
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(freshProfile);

      // Act
      const result = await service.execute();

      // Assert
      expect(
        mockAIContextRepository.refreshReaderProfile,
      ).not.toHaveBeenCalled();
      expect(result).toEqual(freshProfile);
    });
  });

  describe("refreshIfNeeded", () => {
    it("should refresh on book_completed event", async () => {
      // Arrange
      const currentProfile = {
        id: 1,
        version: 3,
        profile_data: JSON.stringify({ statistics: { totalBooks: 10 } }),
        last_updated: new Date(),
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(
        currentProfile,
      );
      mockAIContextRepository.refreshReaderProfile.mockResolvedValue({
        version: 4,
        profileData: { statistics: { totalBooks: 11 } },
        semanticSummary: "Updated",
        tokensUsed: 250,
      });

      // Act
      const result = await service.refreshIfNeeded({
        event: "book_completed",
        bookId: 123,
      });

      // Assert
      expect(mockAIContextRepository.refreshReaderProfile).toHaveBeenCalledWith(
        "book_completed",
      );
      expect(result.refreshed).toBe(true);
      expect(result.reason).toBe("book_completed");
      expect(result.version).toBe(4);
    });

    it("should refresh on book_abandoned event", async () => {
      // Arrange
      const currentProfile = {
        id: 1,
        version: 2,
        profile_data: JSON.stringify({ statistics: { totalBooks: 5 } }),
        last_updated: new Date(),
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(
        currentProfile,
      );
      mockAIContextRepository.refreshReaderProfile.mockResolvedValue({
        version: 3,
        profileData: { statistics: { totalBooks: 5 } },
        semanticSummary: "Book abandoned",
        tokensUsed: 220,
      });

      // Act
      const result = await service.refreshIfNeeded({
        event: "book_abandoned",
        bookId: 456,
      });

      // Assert
      expect(mockAIContextRepository.refreshReaderProfile).toHaveBeenCalledWith(
        "book_abandoned",
      );
      expect(result.refreshed).toBe(true);
      expect(result.reason).toBe("book_abandoned");
    });

    it("should refresh on top_authors_changed", async () => {
      // Arrange
      const currentProfile = {
        id: 1,
        version: 5,
        profile_data: JSON.stringify({
          topAuthors: [
            { name: "Author A", bookCount: 5 },
            { name: "Author B", bookCount: 4 },
            { name: "Author C", bookCount: 3 },
          ],
        }),
        last_updated: new Date(),
      };

      const newProfileData = {
        topAuthors: [
          { name: "Author D", bookCount: 6 },
          { name: "Author A", bookCount: 5 },
          { name: "Author B", bookCount: 4 },
        ],
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(
        currentProfile,
      );
      mockAIContextRepository.calculateReaderProfile.mockResolvedValue(
        newProfileData,
      );
      mockAIContextRepository._detectTopAuthorsChange.mockReturnValue(true);
      mockAIContextRepository.refreshReaderProfile.mockResolvedValue({
        version: 6,
        profileData: newProfileData,
        semanticSummary: "Top authors changed",
        tokensUsed: 270,
      });

      // Act
      const result = await service.refreshIfNeeded({
        event: "book_status_changed",
        bookId: 789,
      });

      // Assert
      expect(mockAIContextRepository.calculateReaderProfile).toHaveBeenCalled();
      expect(
        mockAIContextRepository._detectTopAuthorsChange,
      ).toHaveBeenCalled();
      expect(mockAIContextRepository.refreshReaderProfile).toHaveBeenCalledWith(
        "top_authors_changed",
      );
      expect(result.refreshed).toBe(true);
      expect(result.reason).toBe("top_authors_changed");
    });

    it("should NOT refresh on regular session log", async () => {
      // Arrange
      const currentProfile = {
        id: 1,
        version: 3,
        profile_data: JSON.stringify({ statistics: { totalBooks: 10 } }),
        last_updated: new Date(),
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(
        currentProfile,
      );

      // Act
      const result = await service.refreshIfNeeded({
        event: "session_logged",
        bookId: 123,
      });

      // Assert
      expect(
        mockAIContextRepository.refreshReaderProfile,
      ).not.toHaveBeenCalled();
      expect(result.refreshed).toBe(false);
    });

    it("should NOT refresh when top authors unchanged", async () => {
      // Arrange
      const currentProfile = {
        id: 1,
        version: 5,
        profile_data: JSON.stringify({
          topAuthors: [
            { name: "Author A", bookCount: 5 },
            { name: "Author B", bookCount: 4 },
            { name: "Author C", bookCount: 3 },
          ],
        }),
        last_updated: new Date(),
      };

      const newProfileData = {
        topAuthors: [
          { name: "Author A", bookCount: 6 },
          { name: "Author B", bookCount: 5 },
          { name: "Author C", bookCount: 4 },
        ],
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(
        currentProfile,
      );
      mockAIContextRepository.calculateReaderProfile.mockResolvedValue(
        newProfileData,
      );
      mockAIContextRepository._detectTopAuthorsChange.mockReturnValue(false);

      // Act
      const result = await service.refreshIfNeeded({
        event: "book_status_changed",
        bookId: 789,
      });

      // Assert
      expect(
        mockAIContextRepository._detectTopAuthorsChange,
      ).toHaveBeenCalled();
      expect(
        mockAIContextRepository.refreshReaderProfile,
      ).not.toHaveBeenCalled();
      expect(result.refreshed).toBe(false);
    });

    it("should handle refresh errors gracefully (logs warning)", async () => {
      // Arrange
      const currentProfile = {
        id: 1,
        version: 3,
        profile_data: JSON.stringify({ statistics: { totalBooks: 10 } }),
        last_updated: new Date(),
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(
        currentProfile,
      );
      mockAIContextRepository.refreshReaderProfile.mockRejectedValue(
        new Error("Database connection failed"),
      );

      // Act & Assert
      await expect(
        service.refreshIfNeeded({
          event: "book_completed",
          bookId: 123,
        }),
      ).rejects.toThrow("Database connection failed");
    });

    it("should NOT refresh on non-critical events", async () => {
      // Arrange
      const currentProfile = {
        id: 1,
        version: 3,
        profile_data: JSON.stringify({ statistics: { totalBooks: 10 } }),
        last_updated: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago (fresh)
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(
        currentProfile,
      );

      const nonCriticalEvents = [
        "book_score_updated",
        "book_comment_updated",
        "book_added_to_wishlist",
      ];

      // Act & Assert
      for (const event of nonCriticalEvents) {
        const result = await service.refreshIfNeeded({ event, bookId: 123 });
        expect(result.refreshed).toBe(false);
      }

      expect(
        mockAIContextRepository.refreshReaderProfile,
      ).not.toHaveBeenCalled();
    });
  });

  describe("_shouldRefreshProfile", () => {
    it("should return true for book_completed", () => {
      // Arrange
      const currentProfile = {
        last_updated: new Date(),
      };

      // Act
      const decision = service._shouldRefreshProfile({
        event: "book_completed",
        currentProfile,
      });

      // Assert
      expect(decision.shouldRefresh).toBe(true);
      expect(decision.reason).toBe("book_completed");
    });

    it("should return true for book_abandoned", () => {
      // Arrange
      const currentProfile = {
        last_updated: new Date(),
      };

      // Act
      const decision = service._shouldRefreshProfile({
        event: "book_abandoned",
        currentProfile,
      });

      // Assert
      expect(decision.shouldRefresh).toBe(true);
      expect(decision.reason).toBe("book_abandoned");
    });

    it("should return true for stale profile", () => {
      // Arrange
      const staleProfile = {
        last_updated: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
      };

      // Act
      const decision = service._shouldRefreshProfile({
        event: "manual_check",
        currentProfile: staleProfile,
      });

      // Assert
      expect(decision.shouldRefresh).toBe(true);
      expect(decision.reason).toBe("stale_profile");
    });

    it("should return true for missing profile", () => {
      // Arrange
      const currentProfile = null;

      // Act
      const decision = service._shouldRefreshProfile({
        event: "any_event",
        currentProfile,
      });

      // Assert
      expect(decision.shouldRefresh).toBe(true);
      expect(decision.reason).toBe("stale_profile");
    });

    it("should return false for non-critical events with fresh profile", () => {
      // Arrange
      const freshProfile = {
        last_updated: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      };

      // Act
      const decision = service._shouldRefreshProfile({
        event: "session_logged",
        currentProfile: freshProfile,
      });

      // Assert
      expect(decision.shouldRefresh).toBe(false);
    });

    it("should return check_top_authors for book_status_changed", () => {
      // Arrange
      const currentProfile = {
        last_updated: new Date(),
      };

      // Act
      const decision = service._shouldRefreshProfile({
        event: "book_status_changed",
        currentProfile,
      });

      // Assert
      expect(decision.shouldRefresh).toBe(true);
      expect(decision.reason).toBe("check_top_authors");
    });
  });

  describe("_isProfileStale", () => {
    it("should return true if profile is null", () => {
      // Act
      const isStale = service._isProfileStale(null);

      // Assert
      expect(isStale).toBe(true);
    });

    it("should return true if last_updated > 24 hours ago", () => {
      // Arrange
      const staleProfile = {
        last_updated: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours ago
      };

      // Act
      const isStale = service._isProfileStale(staleProfile);

      // Assert
      expect(isStale).toBe(true);
    });

    it("should return false if last_updated < 24 hours ago", () => {
      // Arrange
      const freshProfile = {
        last_updated: new Date(Date.now() - 20 * 60 * 60 * 1000), // 20 hours ago
      };

      // Act
      const isStale = service._isProfileStale(freshProfile);

      // Assert
      expect(isStale).toBe(false);
    });

    it("should return false if last_updated is exactly 24 hours ago", () => {
      // Arrange
      const profile = {
        last_updated: new Date(Date.now() - 24 * 60 * 60 * 1000), // Exactly 24 hours
      };

      // Act
      const isStale = service._isProfileStale(profile);

      // Assert
      expect(isStale).toBe(false);
    });

    it("should return true if profile is undefined", () => {
      // Act
      const isStale = service._isProfileStale(undefined);

      // Assert
      expect(isStale).toBe(true);
    });

    it("should handle edge case: 24 hours + 1 second", () => {
      // Arrange
      const profile = {
        last_updated: new Date(Date.now() - (24 * 60 * 60 * 1000 + 1000)), // 24h + 1s
      };

      // Act
      const isStale = service._isProfileStale(profile);

      // Assert
      expect(isStale).toBe(true);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete refresh flow with OpenAI success", async () => {
      // Arrange
      const currentProfile = {
        id: 1,
        version: 3,
        profile_data: JSON.stringify({ statistics: { totalBooks: 10 } }),
        last_updated: new Date(),
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(
        currentProfile,
      );
      mockAIContextRepository.refreshReaderProfile.mockResolvedValue({
        version: 4,
        profileData: { statistics: { totalBooks: 11 } },
        semanticSummary: "Successfully refreshed",
        tokensUsed: 280,
      });

      // Act
      const result = await service.refreshIfNeeded({
        event: "book_completed",
        bookId: 999,
      });

      // Assert
      expect(result.refreshed).toBe(true);
      expect(result.reason).toBe("book_completed");
      expect(result.version).toBe(4);
    });

    it("should handle refresh flow with OpenAI failure (graceful degradation)", async () => {
      // Arrange
      const currentProfile = {
        id: 1,
        version: 3,
        profile_data: JSON.stringify({ statistics: { totalBooks: 10 } }),
        last_updated: new Date(),
      };

      mockAIContextRepository.getReaderProfile.mockResolvedValue(
        currentProfile,
      );
      mockAIContextRepository.refreshReaderProfile.mockResolvedValue({
        version: 4,
        profileData: { statistics: { totalBooks: 11 } },
        semanticSummary: null, // OpenAI failed
        tokensUsed: 0,
      });

      // Act
      const result = await service.refreshIfNeeded({
        event: "book_completed",
        bookId: 999,
      });

      // Assert
      expect(result.refreshed).toBe(true);
      expect(result.version).toBe(4);
      // Profile still refreshed despite OpenAI failure
    });
  });
});
