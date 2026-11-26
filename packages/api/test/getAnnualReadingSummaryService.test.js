import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetAnnualReadingSummaryService } from "../services/getAnnualReadingSummaryService.js";

describe("GetAnnualReadingSummaryService", () => {
  let service;
  let mockReadingStatsRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReadingStatsRepository = {
      getFinishedCyclesByYear: vi.fn(),
      getReadingDaysInFinishedCycles: vi.fn(),
      getFinishedCycleYears: vi.fn(),
      getMonthlyReadingActivity: vi.fn(),
    };

    service = new GetAnnualReadingSummaryService(mockReadingStatsRepository);
  });

  it("composes finished cycles into the annual summary", async () => {
    mockReadingStatsRepository.getFinishedCyclesByYear.mockResolvedValue([
      {
        book_id: 1,
        title: "El túnel",
        author_name: "Ernesto Sabato",
        reading_cycle: 1,
        finished_at: new Date(2026, 0, 20, 18, 0, 0),
        sessions_count: 3,
        pages_read: 160,
        first_session: new Date(2026, 0, 10, 9, 0, 0),
        last_session: new Date(2026, 0, 14, 22, 0, 0),
        total_pages: 160,
        score: 8,
      },
    ]);
    mockReadingStatsRepository.getReadingDaysInFinishedCycles.mockResolvedValue(
      [new Date(2026, 0, 10), new Date(2026, 0, 12), new Date(2026, 0, 14)],
    );
    mockReadingStatsRepository.getFinishedCycleYears.mockResolvedValue([
      2026, 2025,
    ]);
    mockReadingStatsRepository.getMonthlyReadingActivity.mockResolvedValue([
      { month_number: 1, pages_read: 100 },
      { month_number: 2, pages_read: 60 },
    ]);

    const result = await service.execute(2026);

    expect(
      mockReadingStatsRepository.getFinishedCyclesByYear,
    ).toHaveBeenCalledWith(2026);
    expect(
      mockReadingStatsRepository.getMonthlyReadingActivity,
    ).toHaveBeenCalledWith(2026);
    expect(result.year).toBe(2026);
    expect(result.books_finished).toBe(1);
    expect(result.pages_read).toBe(160);
    expect(result.reading_days).toBe(3);
    expect(result.average_pages_per_day).toBe(32);
    expect(result.available_years).toEqual([2026, 2025]);
    expect(result.monthly_activity).toHaveLength(12);
    expect(result.monthly_activity[0]).toEqual({ month: 1, pages_read: 100 });
    expect(result.monthly_activity[1]).toEqual({ month: 2, pages_read: 60 });
    expect(result.monthly_activity[2]).toEqual({ month: 3, pages_read: 0 });
    expect(result.cycles[0]).toMatchObject({
      book_id: 1,
      title: "El túnel",
      sessions: 3,
      days: 5,
      pages_per_day: 32,
      has_session_data: true,
    });
  });

  it("returns null figures instead of fabricating data for empty years", async () => {
    mockReadingStatsRepository.getFinishedCyclesByYear.mockResolvedValue([]);
    mockReadingStatsRepository.getReadingDaysInFinishedCycles.mockResolvedValue(
      [],
    );
    mockReadingStatsRepository.getFinishedCycleYears.mockResolvedValue([]);

    const result = await service.execute(2027);

    expect(result.books_finished).toBe(0);
    expect(result.pages_read).toBe(0);
    expect(result.reading_days).toBe(0);
    expect(result.average_pages_per_day).toBeNull();
    expect(result.cycles).toEqual([]);
    expect(result.highlights).toEqual({
      fastest_finish: null,
      longest_book: null,
      highest_rated: null,
    });
  });

  it("keeps cycles with no session data countable but unmeasured", async () => {
    mockReadingStatsRepository.getFinishedCyclesByYear.mockResolvedValue([
      {
        book_id: 7,
        title: "Manually reviewed book",
        author_name: "Unknown Author",
        reading_cycle: 1,
        finished_at: new Date(2026, 3, 2, 10, 0, 0),
        sessions_count: 0,
        pages_read: 0,
        first_session: null,
        last_session: null,
        total_pages: 240,
        score: null,
      },
    ]);
    mockReadingStatsRepository.getReadingDaysInFinishedCycles.mockResolvedValue(
      [],
    );
    mockReadingStatsRepository.getFinishedCycleYears.mockResolvedValue([2026]);

    const result = await service.execute(2026);

    expect(result.books_finished).toBe(1);
    expect(result.average_pages_per_day).toBeNull();
    expect(result.cycles[0]).toMatchObject({
      days: null,
      pages_per_day: null,
      has_session_data: false,
    });
    expect(result.highlights.fastest_finish).toBeNull();
    expect(result.highlights.longest_book.title).toBe("Manually reviewed book");
  });
});
