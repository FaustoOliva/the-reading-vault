import { describe, it, expect, beforeEach, vi } from "vitest";
import { CalculateReadingKPIService } from "../services/calculateReadingKPIService.js";

describe("CalculateReadingKPIService", () => {
  let service;
  let mockBookRepository;
  let mockReadingSessionRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBookRepository = {
      calculateGlobalKPIs: vi.fn(),
      getAverageDaysToComplete: vi.fn(),
      getCompletedLibraryInsights: vi.fn(),
    };

    mockReadingSessionRepository = {
      calculateCompletedBooksMetrics: vi.fn(),
      getCompletedSessionDates: vi.fn(),
    };

    service = new CalculateReadingKPIService(
      mockBookRepository,
      mockReadingSessionRepository,
    );
  });

  it("returns KPI payload with completed-books insights", async () => {
    mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
      total: 12,
      completed: 7,
      abandoned: 2,
      reading: 2,
      pendingScore: 1,
      wishList: 0,
      avgScore: 8.37,
      booksRated: 6,
    });

    mockReadingSessionRepository.calculateCompletedBooksMetrics.mockResolvedValue(
      {
        totalSessions: 35,
        totalPages: 5600,
        readingDays: 25,
        firstSessionDate: new Date("2025-01-01T00:00:00.000Z"),
      },
    );

    mockReadingSessionRepository.getCompletedSessionDates.mockResolvedValue([
      new Date("2026-03-07T00:00:00.000Z"),
      new Date("2026-03-06T00:00:00.000Z"),
      new Date("2026-03-05T00:00:00.000Z"),
      new Date("2026-03-01T00:00:00.000Z"),
    ]);

    mockBookRepository.getAverageDaysToComplete.mockResolvedValue(14.4);

    mockBookRepository.getCompletedLibraryInsights.mockResolvedValue({
      most_read_author: {
        author_name: "Jorge Luis Borges",
        books_completed: 5,
      },
      fastest_book: {
        id: 1,
        title: "El tunel",
        author_name: "Ernesto Sabato",
        total_pages: 160,
        days_to_finish: 3,
        pages_per_day: 53.33,
      },
      slowest_book: {
        id: 2,
        title: "Moby Dick",
        author_name: "Herman Melville",
        total_pages: 620,
        days_to_finish: 62,
        pages_per_day: 10,
      },
      longest_book: {
        id: 3,
        title: "The Count of Monte Cristo",
        author_name: "Alexandre Dumas",
        total_pages: 1276,
      },
      shortest_book: {
        id: 4,
        title: "Animal Farm",
        author_name: "George Orwell",
        total_pages: 112,
      },
      highest_rated_book: {
        id: 5,
        title: "Ficciones",
        author_name: "Jorge Luis Borges",
        score: 10,
      },
      lowest_rated_book: {
        id: 6,
        title: "The Trial",
        author_name: "Franz Kafka",
        score: 6,
      },
    });

    const result = await service.execute();

    expect(
      mockReadingSessionRepository.calculateCompletedBooksMetrics,
    ).toHaveBeenCalledTimes(1);
    expect(
      mockReadingSessionRepository.getCompletedSessionDates,
    ).toHaveBeenCalledTimes(1);
    expect(
      mockBookRepository.getCompletedLibraryInsights,
    ).toHaveBeenCalledTimes(1);

    expect(result.kpis.total_books).toBe(12);
    expect(result.kpis.books_completed).toBe(7);
    expect(result.kpis.total_sessions).toBe(35);
    expect(result.kpis.total_pages_read).toBe(5600);
    expect(result.kpis.average_pages_per_session).toBe(160);
    expect(result.kpis.average_days_to_complete).toBe(14);
    expect(result.kpis.library_insights.most_read_author?.author_name).toBe(
      "Jorge Luis Borges",
    );
    expect(result.kpis.library_insights.fastest_book?.title).toBe("El tunel");
  });

  it("returns safe defaults when there are no completed-book sessions", async () => {
    mockBookRepository.calculateGlobalKPIs.mockResolvedValue({
      total: 4,
      completed: 0,
      abandoned: 1,
      reading: 3,
      pendingScore: 0,
      wishList: 0,
      avgScore: null,
      booksRated: 0,
    });

    mockReadingSessionRepository.calculateCompletedBooksMetrics.mockResolvedValue(
      {
        totalSessions: 0,
        totalPages: 0,
        readingDays: 0,
        firstSessionDate: null,
      },
    );

    mockReadingSessionRepository.getCompletedSessionDates.mockResolvedValue([]);
    mockBookRepository.getAverageDaysToComplete.mockResolvedValue(null);
    mockBookRepository.getCompletedLibraryInsights.mockResolvedValue({
      most_read_author: null,
      fastest_book: null,
      slowest_book: null,
      longest_book: null,
      shortest_book: null,
      highest_rated_book: null,
      lowest_rated_book: null,
    });

    const result = await service.execute();

    expect(result.kpis.average_pages_per_session).toBe(0);
    expect(result.kpis.current_streak).toBe(0);
    expect(result.kpis.longest_streak).toBe(0);
    expect(result.kpis.reading_days).toBe(0);
    expect(result.kpis.library_insights.fastest_book).toBeNull();
  });
});
