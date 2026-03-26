import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnalyzeAuthorSynergyService } from "../services/analyzeAuthorSynergyService.js";
import {
  NotFoundError,
  ReaderProfileMinimumBooksError,
} from "../errors/index.js";

describe("AnalyzeAuthorSynergyService", () => {
  let service;
  let mockGetReaderProfileService;
  let mockOpenAIClient;
  let mockAuthorRepository;
  let mockBookRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetReaderProfileService = {
      execute: vi.fn(),
      getMinimumRequirementStatus: vi.fn(),
    };

    mockOpenAIClient = {
      analyzeAuthorSynergy: vi.fn(),
    };

    mockAuthorRepository = {
      getById: vi.fn(),
    };

    mockBookRepository = {
      getBooksByAuthorId: vi.fn(),
    };

    service = new AnalyzeAuthorSynergyService(
      mockGetReaderProfileService,
      mockOpenAIClient,
      mockAuthorRepository,
      mockBookRepository,
    );
  });

  it("should return synergy analysis for existing author", async () => {
    mockAuthorRepository.getById.mockResolvedValue({
      id: 4,
      name: "Author Test",
      nationality: "Argentina",
    });

    mockGetReaderProfileService.execute.mockResolvedValue({
      profileData: {
        statistics: {
          completedBooks: 6,
          abandonedBooks: 1,
        },
      },
      semanticSummary: "Reader profile summary",
    });

    mockBookRepository.getBooksByAuthorId.mockResolvedValue([
      { title: "Book A", status: "COMPLETED", score: 9.0 },
    ]);

    mockOpenAIClient.analyzeAuthorSynergy.mockResolvedValue({
      compatibility: {
        score: 88,
        label: "very_high",
        reasoning: "The author strongly matches profile patterns",
        positiveSignals: ["High completion and score history"],
        cautionSignals: [],
      },
      tokensUsed: 275,
    });

    const result = await service.execute(4);

    expect(result.author.id).toBe(4);
    expect(result.compatibility.score).toBe(88);
    expect(result.inputMode).toBe("semantic");
    expect(result.tokensUsed).toBe(275);
  });

  it("should throw NotFoundError when author does not exist", async () => {
    mockAuthorRepository.getById.mockResolvedValue(null);

    await expect(service.execute(777)).rejects.toThrow(NotFoundError);
  });

  it("should throw ReaderProfileMinimumBooksError when profile is unavailable", async () => {
    mockAuthorRepository.getById.mockResolvedValue({
      id: 4,
      name: "Author Test",
      nationality: "Argentina",
    });

    mockGetReaderProfileService.execute.mockResolvedValue(null);
    mockGetReaderProfileService.getMinimumRequirementStatus.mockResolvedValue({
      current: 2,
      required: 5,
      eligible: false,
    });

    await expect(service.execute(4)).rejects.toThrow(
      ReaderProfileMinimumBooksError,
    );
  });
});
