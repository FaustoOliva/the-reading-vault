import { describe, it, expect } from "vitest";
import { AnnualReadingSummary } from "../models/AnnualReadingSummary.js";
import { ReadingCycleSummary } from "../models/ReadingCycleSummary.js";

function buildCycle(overrides = {}) {
  return ReadingCycleSummary.fromDatabase({
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
    ...overrides,
  });
}

describe("ReadingCycleSummary", () => {
  it("counts inclusive calendar days from the first to the last session", () => {
    const cycle = buildCycle();

    expect(cycle.days).toBe(5);
    expect(cycle.pagesPerDay).toBe(32);
    expect(cycle.hasSessionData).toBe(true);
  });

  it("treats a same-day cycle as one day", () => {
    const cycle = buildCycle({
      pages_read: 40,
      first_session: new Date(2026, 0, 10, 8, 0, 0),
      last_session: new Date(2026, 0, 10, 23, 30, 0),
      total_pages: 40,
    });

    expect(cycle.days).toBe(1);
    expect(cycle.pagesPerDay).toBe(40);
  });

  it("reports no duration or pace when the cycle has no sessions", () => {
    const cycle = buildCycle({
      sessions_count: 0,
      pages_read: 0,
      first_session: null,
      last_session: null,
    });

    expect(cycle.hasSessionData).toBe(false);
    expect(cycle.days).toBeNull();
    expect(cycle.pagesPerDay).toBeNull();
    expect(cycle.toJSON()).toMatchObject({
      days: null,
      pages_per_day: null,
      has_session_data: false,
    });
  });
});

describe("AnnualReadingSummary", () => {
  it("sums effort across finished cycles of the year", () => {
    const summary = new AnnualReadingSummary({
      year: 2026,
      readingDays: 12,
      cycles: [
        buildCycle(),
        buildCycle({
          book_id: 2,
          title: "1984",
          reading_cycle: 1,
          pages_read: 328,
          first_session: new Date(2026, 1, 1, 9, 0, 0),
          last_session: new Date(2026, 1, 9, 9, 0, 0),
          total_pages: 328,
          score: 9,
        }),
      ],
    });

    expect(summary.booksFinished).toBe(2);
    expect(summary.pagesRead).toBe(488);
    expect(summary.readingDays).toBe(12);
  });

  it("averages cycle velocities and excludes cycles without session data", () => {
    const summary = new AnnualReadingSummary({
      year: 2026,
      readingDays: 5,
      cycles: [
        buildCycle(),
        buildCycle({
          book_id: 2,
          title: "Reviewed without sessions",
          sessions_count: 0,
          pages_read: 0,
          first_session: null,
          last_session: null,
          total_pages: 200,
          score: null,
        }),
        buildCycle({
          book_id: 3,
          title: "Animal Farm",
          reading_cycle: 1,
          pages_read: 120,
          first_session: new Date(2026, 2, 1, 9, 0, 0),
          last_session: new Date(2026, 2, 3, 9, 0, 0),
          total_pages: 120,
          score: 7,
        }),
      ],
    });

    // 160/5 = 32 and 120/3 = 40 => mean 36
    expect(summary.averagePagesPerDay).toBe(36);
    expect(summary.booksFinished).toBe(3);
    expect(summary.pagesRead).toBe(280);
  });

  it("returns null average when no cycle has session data", () => {
    const summary = new AnnualReadingSummary({
      year: 2026,
      readingDays: 0,
      cycles: [
        buildCycle({
          sessions_count: 0,
          pages_read: 0,
          first_session: null,
          last_session: null,
        }),
      ],
    });

    expect(summary.averagePagesPerDay).toBeNull();
    expect(summary.booksFinished).toBe(1);
  });

  it("selects fastest finish, longest book and highest rated book", () => {
    const summary = new AnnualReadingSummary({
      year: 2026,
      readingDays: 12,
      cycles: [
        buildCycle(),
        buildCycle({
          book_id: 2,
          title: "1984",
          pages_read: 328,
          first_session: new Date(2026, 1, 1, 9, 0, 0),
          last_session: new Date(2026, 1, 9, 9, 0, 0),
          total_pages: 328,
          score: 10,
        }),
        buildCycle({
          book_id: 3,
          title: "Moby Dick",
          pages_read: 620,
          first_session: new Date(2026, 2, 1, 9, 0, 0),
          last_session: new Date(2026, 2, 30, 9, 0, 0),
          total_pages: 620,
          score: 6,
        }),
      ],
    });

    const highlights = summary.highlights;

    expect(highlights.fastest_finish.title).toBe("1984");
    expect(highlights.fastest_finish.pagesPerDay).toBe(36.4);
    expect(highlights.longest_book.title).toBe("Moby Dick");
    expect(highlights.longest_book.totalPages).toBe(620);
    expect(highlights.highest_rated.title).toBe("1984");
    expect(highlights.highest_rated.score).toBe(10);
  });

  it("ignores unrated and pageless cycles when picking highlights", () => {
    const summary = new AnnualReadingSummary({
      year: 2026,
      readingDays: 5,
      cycles: [
        buildCycle({ total_pages: null, score: null }),
        buildCycle({
          book_id: 2,
          title: "Unmeasured",
          sessions_count: 0,
          pages_read: 0,
          first_session: null,
          last_session: null,
          total_pages: null,
          score: null,
        }),
      ],
    });

    const highlights = summary.highlights;

    expect(highlights.fastest_finish.title).toBe("El túnel");
    expect(highlights.longest_book).toBeNull();
    expect(highlights.highest_rated).toBeNull();
  });

  it("reports independent monthly totals, zero-filled across the year", () => {
    const summary = new AnnualReadingSummary({
      year: 2026,
      readingDays: 0,
      cycles: [],
      sessionPagesByMonth: [
        { month_number: 1, pages_read: 120 },
        { month_number: 3, pages_read: 40 },
        { month_number: 3, pages_read: 10 },
        { month_number: 13, pages_read: 999 },
      ],
    });

    const months = summary.monthlyActivity;

    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ month: 1, pages_read: 120 });
    expect(months[1]).toEqual({ month: 2, pages_read: 0 });
    expect(months[2]).toEqual({ month: 3, pages_read: 50 });
    expect(months[3]).toEqual({ month: 4, pages_read: 0 });
    expect(months.every((month) => month.pages_read >= 0)).toBe(true);
  });
});
