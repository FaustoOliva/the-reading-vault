/**
 * OpenAIClient Test Suite - MVP
 * Tests for OpenAI API integration
 *
 * Pattern: AAA (Arrange-Act-Assert)
 * Target Coverage: ≥ 80%
 * Phase: MVP (Schema Version 1)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { OpenAIClient } from "../infraestructure/ai/openAIClient.js";
import {
  OpenAIUnavailableError,
  OpenAITimeoutError,
  OpenAIRateLimitError,
  OpenAIInvalidAPIKeyError,
} from "../errors/domain/openAIErrors.js";

// Mock global fetch
global.fetch = vi.fn();

describe("OpenAIClient - MVP", () => {
  let client;
  let config;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      apiKey: "sk-test-key-123",
      model: "gpt-3.5-turbo",
      temperature: 0.4,
      maxTokens: 300,
      timeout: 15000,
    };

    client = new OpenAIClient(config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with provided config", () => {
      // Assert
      expect(client.apiKey).toBe("sk-test-key-123");
      expect(client.model).toBe("gpt-3.5-turbo");
      expect(client.temperature).toBe(0.4);
      expect(client.maxTokens).toBe(300);
      expect(client.timeout).toBe(15000);
    });

    it("should use default values when config incomplete", () => {
      // Arrange
      const minimalConfig = { apiKey: "sk-test" };

      // Act
      const minimalClient = new OpenAIClient(minimalConfig);

      // Assert
      expect(minimalClient.model).toBe("gpt-3.5-turbo");
      expect(minimalClient.temperature).toBe(0.4);
      expect(minimalClient.maxTokens).toBe(300);
      expect(minimalClient.timeout).toBe(15000);
    });
  });

  describe("generateProfileSummary", () => {
    it("should generate narrative summary from MVP profile data", async () => {
      // Arrange
      const profileData = {
        version: 1,
        schemaVersion: 1,
        statistics: {
          totalBooks: 23,
          completedBooks: 15,
          booksInProgress: 3,
          abandonedBooks: 5,
          completionRate: 0.65,
          avgScore: 7.8,
        },
        topAuthors: [
          {
            name: "García Márquez",
            nationality: "Colombia",
            bookCount: 8,
            avgScore: 9.5,
          },
          {
            name: "Jorge Luis Borges",
            nationality: "Argentina",
            bookCount: 5,
            avgScore: 9.0,
          },
        ],
        topCountries: [
          { name: "Colombia", bookCount: 8 },
          { name: "Argentina", bookCount: 5 },
        ],
        favoriteBooks: [
          {
            title: "Cien Años de Soledad",
            author: "García Márquez",
            score: 10,
          },
        ],
        abandonedBooks: [],
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content:
                  "Este lector ha completado 15 libros con una tasa de finalización del 65%...",
              },
            },
          ],
          usage: {
            total_tokens: 287,
          },
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act
      const result = await client.generateProfileSummary(profileData);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer sk-test-key-123",
          }),
        }),
      );

      const fetchCallBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(fetchCallBody.model).toBe("gpt-3.5-turbo");
      expect(fetchCallBody.temperature).toBe(0.4);
      expect(fetchCallBody.max_tokens).toBe(300);
      expect(result.summary).toContain("Este lector ha completado 15 libros");
      expect(result.tokensUsed).toBe(287);
    });

    it("should include statistics in generated summary", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 50,
          completedBooks: 40,
          completionRate: 0.8,
          avgScore: 8.5,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Summary with stats" } }],
          usage: { total_tokens: 250 },
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act
      await client.generateProfileSummary(profileData);

      // Assert
      const fetchCallBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      const userPrompt = fetchCallBody.messages[1].content;

      expect(userPrompt).toContain("40");
      expect(userPrompt).toContain("80.0%");
      expect(userPrompt).toContain("8.5");
    });

    it("should include top authors and countries", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 10,
          completedBooks: 8,
          completionRate: 0.8,
          avgScore: 7.5,
        },
        topAuthors: [
          { name: "Author A", bookCount: 5, avgScore: 8.0 },
          { name: "Author B", bookCount: 3, avgScore: 7.5 },
        ],
        topCountries: [
          { name: "Country X", bookCount: 6 },
          { name: "Country Y", bookCount: 4 },
        ],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Summary" } }],
          usage: { total_tokens: 200 },
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act
      await client.generateProfileSummary(profileData);

      // Assert
      const fetchCallBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      const userPrompt = fetchCallBody.messages[1].content;

      expect(userPrompt).toContain("Author A");
      expect(userPrompt).toContain("Country X");
    });

    it("should include favorite books in prompt", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 5,
          completedBooks: 5,
          completionRate: 1.0,
          avgScore: 9.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [
          { title: "1984", author: "Orwell", score: 10 },
          { title: "Brave New World", author: "Huxley", score: 9 },
        ],
        abandonedBooks: [],
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Summary" } }],
          usage: { total_tokens: 220 },
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act
      await client.generateProfileSummary(profileData);

      // Assert
      const fetchCallBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      const userPrompt = fetchCallBody.messages[1].content;

      expect(userPrompt).toContain("1984");
      expect(userPrompt).toContain("Orwell");
    });

    it("should respect timeout (15s default)", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 1,
          completedBooks: 1,
          completionRate: 1.0,
          avgScore: 8.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      global.fetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  choices: [{ message: { content: "Summary" } }],
                  usage: { total_tokens: 150 },
                }),
            });
          }, 20000); // 20 seconds - exceeds timeout
        });
      });

      // Act & Assert
      await expect(client.generateProfileSummary(profileData)).rejects.toThrow(
        OpenAITimeoutError,
      );
    });

    it("should respect max_tokens limit (300)", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 10,
          completedBooks: 7,
          completionRate: 0.7,
          avgScore: 8.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Summary" } }],
          usage: { total_tokens: 250 },
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act
      await client.generateProfileSummary(profileData);

      // Assert
      const fetchCallBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(fetchCallBody.max_tokens).toBe(300);
    });

    it("should use configured temperature (0.4)", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 1,
          completedBooks: 1,
          completionRate: 1.0,
          avgScore: 8.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Summary" } }],
          usage: { total_tokens: 150 },
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act
      await client.generateProfileSummary(profileData);

      // Assert
      const fetchCallBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(fetchCallBody.temperature).toBe(0.4);
    });

    it("should return summary and token count", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 5,
          completedBooks: 3,
          completionRate: 0.6,
          avgScore: 7.5,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "Generated summary text",
              },
            },
          ],
          usage: {
            total_tokens: 314,
          },
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act
      const result = await client.generateProfileSummary(profileData);

      // Assert
      expect(result).toEqual({
        summary: "Generated summary text",
        tokensUsed: 314,
      });
    });

    it("should throw OpenAIUnavailableError when connection fails", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 1,
          completedBooks: 1,
          completionRate: 1.0,
          avgScore: 8.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      global.fetch.mockRejectedValue(new Error("Network error"));

      // Act & Assert
      await expect(client.generateProfileSummary(profileData)).rejects.toThrow(
        OpenAIUnavailableError,
      );
    });

    it("should throw OpenAITimeoutError when request times out", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 1,
          completedBooks: 1,
          completionRate: 1.0,
          avgScore: 8.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      global.fetch.mockRejectedValue(abortError);

      // Act & Assert
      await expect(client.generateProfileSummary(profileData)).rejects.toThrow(
        OpenAITimeoutError,
      );
    });

    it("should throw OpenAIRateLimitError when rate limit exceeded (429)", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 1,
          completedBooks: 1,
          completionRate: 1.0,
          avgScore: 8.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      const mockResponse = {
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValue({
          error: {
            message: "Rate limit exceeded",
          },
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(client.generateProfileSummary(profileData)).rejects.toThrow(
        OpenAIRateLimitError,
      );
    });

    it("should throw OpenAIInvalidAPIKeyError when API key invalid (401)", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 1,
          completedBooks: 1,
          completionRate: 1.0,
          avgScore: 8.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      const mockResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({
          error: {
            message: "Invalid API key",
          },
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(client.generateProfileSummary(profileData)).rejects.toThrow(
        OpenAIInvalidAPIKeyError,
      );
    });

    it("should handle generic API errors", async () => {
      // Arrange
      const profileData = {
        statistics: {
          totalBooks: 1,
          completedBooks: 1,
          completionRate: 1.0,
          avgScore: 8.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({
          error: {
            message: "Internal server error",
          },
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        client.generateProfileSummary(profileData),
      ).rejects.toThrow();
    });
  });

  describe("checkHealth", () => {
    it("should return ok status when OpenAI API accessible", async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue("org-xyz"),
        },
        json: vi.fn().mockResolvedValue({
          data: [{ id: "gpt-3.5-turbo" }],
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act
      const result = await client.checkHealth();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/models",
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: "Bearer sk-test-key-123",
          },
        }),
      );
      expect(result.status).toBe("ok");
      expect(result.model).toBe("gpt-3.5-turbo");
    });

    it("should include model info", async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
        json: vi.fn().mockResolvedValue({
          data: [],
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act
      const result = await client.checkHealth();

      // Assert
      expect(result.model).toBe("gpt-3.5-turbo");
    });

    it("should include organization when available", async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header) => {
            if (header === "openai-organization") return "org-abc123";
            return null;
          }),
        },
        json: vi.fn().mockResolvedValue({
          data: [],
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act
      const result = await client.checkHealth();

      // Assert
      expect(result.organization).toBe("org-abc123");
    });

    it("should throw error when API key invalid", async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({
          error: {
            message: "Invalid API key",
          },
        }),
      };

      global.fetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(client.checkHealth()).rejects.toThrow(
        OpenAIInvalidAPIKeyError,
      );
    });

    it("should throw OpenAIUnavailableError on connection failure", async () => {
      // Arrange
      global.fetch.mockRejectedValue(new Error("Network error"));

      // Act & Assert
      await expect(client.checkHealth()).rejects.toThrow(
        OpenAIUnavailableError,
      );
    });

    it("should timeout after 5 seconds", async () => {
      // Arrange
      global.fetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              headers: { get: vi.fn() },
              json: () => Promise.resolve({ data: [] }),
            });
          }, 6000); // 6 seconds - exceeds timeout
        });
      });

      // Act & Assert
      await expect(client.checkHealth()).rejects.toThrow();
    });
  });

  describe("_buildProfileSummaryPrompt", () => {
    it("should construct valid MVP prompt with statistics, topAuthors, topCountries, favoriteBooks", () => {
      // Arrange
      const profile = {
        statistics: {
          totalBooks: 23,
          completedBooks: 15,
          booksInProgress: 3,
          abandonedBooks: 5,
          completionRate: 0.65,
          avgScore: 7.8,
        },
        topAuthors: [
          { name: "García Márquez", bookCount: 8, avgScore: 9.5 },
          { name: "Borges", bookCount: 5, avgScore: 9.0 },
        ],
        topCountries: [
          { name: "Colombia", bookCount: 8 },
          { name: "Argentina", bookCount: 5 },
        ],
        favoriteBooks: [
          {
            title: "Cien Años de Soledad",
            author: "García Márquez",
            score: 10,
          },
        ],
        abandonedBooks: [],
      };

      // Act
      const prompt = client._buildProfileSummaryPrompt(profile);

      // Assert
      expect(prompt).toContain("15");
      expect(prompt).toContain("65.0%");
      expect(prompt).toContain("7.8");
      expect(prompt).toContain("García Márquez");
      expect(prompt).toContain("Colombia");
      expect(prompt).toContain("Cien Años de Soledad");
    });

    it("should handle missing data gracefully (e.g., no completed books yet)", () => {
      // Arrange
      const profile = {
        statistics: {
          totalBooks: 0,
          completedBooks: 0,
          booksInProgress: 0,
          abandonedBooks: 0,
          completionRate: 0,
          avgScore: null,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      // Act
      const prompt = client._buildProfileSummaryPrompt(profile);

      // Assert
      expect(prompt).toContain("0");
      expect(prompt).toContain("N/A");
      expect(prompt).toContain("Ninguno aún");
    });

    it("should NOT include Phase 2 data (affinity, implicit signals, reading activity)", () => {
      // Arrange
      const profile = {
        statistics: {
          totalBooks: 5,
          completedBooks: 3,
          completionRate: 0.6,
          avgScore: 8.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
        // These should NOT appear in MVP prompt:
        readingActivity: { totalSessions: 50 },
        implicitSignals: { avgDaysUntilAbandon: 8 },
      };

      // Act
      const prompt = client._buildProfileSummaryPrompt(profile);

      // Assert
      expect(prompt).not.toContain("totalSessions");
      expect(prompt).not.toContain("avgDaysUntilAbandon");
      expect(prompt).not.toContain("affinity");
      expect(prompt).not.toContain("deepEngagement");
    });

    it("should limit to top 3 authors in prompt", () => {
      // Arrange
      const profile = {
        statistics: {
          totalBooks: 10,
          completedBooks: 8,
          completionRate: 0.8,
          avgScore: 8.0,
        },
        topAuthors: [
          { name: "Author 1", bookCount: 5, avgScore: 9.0 },
          { name: "Author 2", bookCount: 4, avgScore: 8.5 },
          { name: "Author 3", bookCount: 3, avgScore: 8.0 },
          { name: "Author 4", bookCount: 2, avgScore: 7.5 },
          { name: "Author 5", bookCount: 1, avgScore: 7.0 },
        ],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      // Act
      const prompt = client._buildProfileSummaryPrompt(profile);

      // Assert
      expect(prompt).toContain("Author 1");
      expect(prompt).toContain("Author 2");
      expect(prompt).toContain("Author 3");
      expect(prompt).not.toContain("Author 4");
      expect(prompt).not.toContain("Author 5");
    });

    it("should include max 300 words instruction", () => {
      // Arrange
      const profile = {
        statistics: {
          totalBooks: 1,
          completedBooks: 1,
          completionRate: 1.0,
          avgScore: 8.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      // Act
      const prompt = client._buildProfileSummaryPrompt(profile);

      // Assert
      expect(prompt).toContain("300 palabras");
      expect(prompt).toContain("Máximo 300 palabras");
    });

    it("should specify Spanish language", () => {
      // Arrange
      const profile = {
        statistics: {
          totalBooks: 1,
          completedBooks: 1,
          completionRate: 1.0,
          avgScore: 8.0,
        },
        topAuthors: [],
        topCountries: [],
        favoriteBooks: [],
        abandonedBooks: [],
      };

      // Act
      const prompt = client._buildProfileSummaryPrompt(profile);

      // Assert
      expect(prompt).toContain("español");
    });
  });
});
