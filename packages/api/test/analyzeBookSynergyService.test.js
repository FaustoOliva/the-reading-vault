import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnalyzeBookSynergyService } from "../services/analyzeBookSynergyService.js";
import {
  NotFoundError,
  ReaderProfileMinimumBooksError,
} from "../errors/index.js";

describe("AnalyzeBookSynergyService", () => {
  let service;
  let mockGetReaderProfileService;
  let mockOpenAIClient;
  let mockBookRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetReaderProfileService = {
      execute: vi.fn(),
      getMinimumRequirementStatus: vi.fn(),
    };

    mockOpenAIClient = {
      analyzeBookSynergy: vi.fn(),
    };

    mockBookRepository = {
      getById: vi.fn(),
    };

    service = new AnalyzeBookSynergyService(
      mockGetReaderProfileService,
      mockOpenAIClient,
      mockBookRepository,
    );
  });

  it("should return synergy analysis for existing book", async () => {
    const mockBook = {
      id: 10,
      title: "Test Book",
      authorId: 2,
      authorName: "Test Author",
      toJSON: vi.fn().mockReturnValue({
        id: 10,
        title: "Test Book",
        author: { id: 2, name: "Test Author" },
        bookType: "Novel",
        genres: ["Drama"],
        synopsis: "A test synopsis",
      }),
    };

    mockBookRepository.getById.mockResolvedValue(mockBook);
    mockGetReaderProfileService.execute.mockResolvedValue({
      profileData: {
        statistics: {
          completedBooks: 5,
          abandonedBooks: 1,
        },
      },
      semanticSummary: "Reader profile summary",
    });

    mockOpenAIClient.analyzeBookSynergy.mockResolvedValue({
      compatibility: {
        score: 82,
        label: "high",
        reasoning: "Strong thematic alignment",
        positiveSignals: ["High genre affinity"],
        cautionSignals: [],
      },
      tokensUsed: 300,
    });

    const result = await service.execute(10);

    expect(result.book.id).toBe(10);
    expect(result.compatibility.score).toBe(82);
    expect(result.tokensUsed).toBe(300);
    expect(result.inputMode).toBe("semantic");
    expect(mockOpenAIClient.analyzeBookSynergy).toHaveBeenCalledTimes(1);
  });

  it("should throw NotFoundError when book does not exist", async () => {
    mockBookRepository.getById.mockResolvedValue(null);

    await expect(service.execute(999)).rejects.toThrow(NotFoundError);
  });

  it("should throw ReaderProfileMinimumBooksError when profile is unavailable", async () => {
    const mockBook = {
      id: 10,
      title: "Test Book",
      authorId: 2,
      authorName: "Test Author",
      toJSON: vi.fn().mockReturnValue({
        id: 10,
        title: "Test Book",
        author: { id: 2, name: "Test Author" },
      }),
    };

    mockBookRepository.getById.mockResolvedValue(mockBook);
    mockGetReaderProfileService.execute.mockResolvedValue(null);
    mockGetReaderProfileService.getMinimumRequirementStatus.mockResolvedValue({
      current: 3,
      required: 5,
      eligible: false,
    });

    await expect(service.execute(10)).rejects.toThrow(
      ReaderProfileMinimumBooksError,
    );
  });
});
