/**
 * AnnualReadingSummary Domain Entity
 * Aggregates the finished reading cycles of a single year into the annual
 * statistics shown by the product: headline figures, highlights and the
 * finished-cycle roster.
 *
 * Business rules (DOMAIN.md):
 * - Books finished are cycles that reached PENDING_SCORE in the selected year
 * - Effort metrics (pages, reading days) are scoped to those finished cycles
 * - Average pages/day is the mean of cycle velocities, never an all-time ratio (§5.1)
 * - Cycles without session data have no measurable pace and are excluded from
 *   averages and highlights, but still count as finished
 * - The reading-activity series is a separate, explicitly approved scope: every
 *   session dated in the year, including books still in progress or abandoned.
 *   It never feeds booksFinished, pagesRead, highlights or cycle velocities.
 */

const MONTHS_IN_YEAR = 12;

/**
 * Order two cycle summaries by title as a stable tie-breaker
 * @param {ReadingCycleSummary} left
 * @param {ReadingCycleSummary} right
 * @returns {number}
 */
function compareByTitle(left, right) {
  if (left.title === right.title) {
    return left.readingCycle - right.readingCycle;
  }

  return left.title < right.title ? -1 : 1;
}

export class AnnualReadingSummary {
  constructor({ year, cycles, readingDays, sessionPagesByMonth = [] }) {
    this.year = year;
    this.cycles = cycles;
    this.readingDays = readingDays;
    this.sessionPagesByMonth = sessionPagesByMonth;
  }

  /**
   * Number of finished cycles in the year
   * @returns {number}
   */
  get booksFinished() {
    return this.cycles.length;
  }

  /**
   * Pages read across the finished cycles of the year
   * @returns {number}
   */
  get pagesRead() {
    return this.cycles.reduce((total, cycle) => total + cycle.pagesRead, 0);
  }

  /**
   * Cycles that can be measured (they have session data)
   * @returns {ReadingCycleSummary[]}
   */
  get measuredCycles() {
    return this.cycles.filter((cycle) => cycle.pagesPerDay !== null);
  }

  /**
   * Mean of cycle velocities. Null when no cycle has session data.
   * @returns {number|null}
   */
  get averagePagesPerDay() {
    const measured = this.measuredCycles;

    if (measured.length === 0) {
      return null;
    }

    const total = measured.reduce((sum, cycle) => sum + cycle.pagesPerDay, 0);

    return Math.round((total / measured.length) * 10) / 10;
  }

  /**
   * Pages read by month for the selected year.
   *
   * Scope (approved separately from the finished-cycle metrics): every reading
   * session whose reading date falls in the year, regardless of book status,
   * cycle or review. Only this series uses that scope.
   *
   * Each month stands on its own, so the series may rise or fall. These are
   * monthly totals, not a running total, and they are not comparable with the
   * finished-cycle `pagesRead` figure.
   *
   * @returns {Array<{month: number, pages_read: number}>} Twelve entries, January first
   */
  get monthlyActivity() {
    const pagesByMonth = new Map();

    for (const row of this.sessionPagesByMonth) {
      const month = Number(row.month_number);
      const pages = Number(row.pages_read);

      if (!Number.isInteger(month) || month < 1 || month > MONTHS_IN_YEAR) {
        continue;
      }

      const safePages = Number.isFinite(pages) ? Math.max(0, pages) : 0;

      pagesByMonth.set(month, (pagesByMonth.get(month) ?? 0) + safePages);
    }

    return Array.from({ length: MONTHS_IN_YEAR }, (_, index) => ({
      month: index + 1,
      pages_read: pagesByMonth.get(index + 1) ?? 0,
    }));
  }

  /**
   * Extremes of the year. Each highlight covers a different dimension,
   * so all three can point at the same cycle without hiding information.
   * @returns {{fastest_finish: ReadingCycleSummary|null, longest_book: ReadingCycleSummary|null, highest_rated: ReadingCycleSummary|null}}
   */
  get highlights() {
    return {
      fastest_finish: this._findFastestFinish(),
      longest_book: this._findLongestBook(),
      highest_rated: this._findHighestRated(),
    };
  }

  /**
   * Highest pages/day among measured cycles
   * @private
   * @returns {ReadingCycleSummary|null}
   */
  _findFastestFinish() {
    return this.measuredCycles.reduce((fastest, cycle) => {
      if (fastest === null) {
        return cycle;
      }

      if (cycle.pagesPerDay !== fastest.pagesPerDay) {
        return cycle.pagesPerDay > fastest.pagesPerDay ? cycle : fastest;
      }

      if (cycle.days !== fastest.days) {
        return cycle.days < fastest.days ? cycle : fastest;
      }

      return compareByTitle(cycle, fastest) < 0 ? cycle : fastest;
    }, null);
  }

  /**
   * Largest book (total_pages) among finished cycles with a page count
   * @private
   * @returns {ReadingCycleSummary|null}
   */
  _findLongestBook() {
    return this.cycles.reduce((longest, cycle) => {
      if (cycle.totalPages === null || cycle.totalPages === undefined) {
        return longest;
      }

      if (longest === null) {
        return cycle;
      }

      if (cycle.totalPages !== longest.totalPages) {
        return cycle.totalPages > longest.totalPages ? cycle : longest;
      }

      return compareByTitle(cycle, longest) < 0 ? cycle : longest;
    }, null);
  }

  /**
   * Highest score among finished cycles that were rated
   * @private
   * @returns {ReadingCycleSummary|null}
   */
  _findHighestRated() {
    return this.cycles.reduce((highest, cycle) => {
      if (cycle.score === null || cycle.score === undefined) {
        return highest;
      }

      if (highest === null) {
        return cycle;
      }

      if (cycle.score !== highest.score) {
        return cycle.score > highest.score ? cycle : highest;
      }

      return compareByTitle(cycle, highest) < 0 ? cycle : highest;
    }, null);
  }

  /**
   * Convert to JSON representation for API responses
   * @returns {Object}
   */
  toJSON() {
    const highlights = this.highlights;

    return {
      year: this.year,
      books_finished: this.booksFinished,
      pages_read: this.pagesRead,
      reading_days: this.readingDays,
      average_pages_per_day: this.averagePagesPerDay,
      cycles: this.cycles.map((cycle) => cycle.toJSON()),
      monthly_activity: this.monthlyActivity,
      highlights: {
        fastest_finish: highlights.fastest_finish
          ? highlights.fastest_finish.toJSON()
          : null,
        longest_book: highlights.longest_book
          ? highlights.longest_book.toJSON()
          : null,
        highest_rated: highlights.highest_rated
          ? highlights.highest_rated.toJSON()
          : null,
      },
    };
  }
}
