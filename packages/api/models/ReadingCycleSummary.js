/**
 * ReadingCycleSummary Domain Entity
 * Represents a finished reading cycle: a book that reached review
 * (PENDING_SCORE) during a specific reading cycle, with the effort metrics
 * of that cycle.
 *
 * Business rules (DOMAIN.md):
 * - KPIs are calculated per reading cycle, never aggregated across cycles (§4.2)
 * - Days elapsed count calendar days from the first session to the latest
 *   session, inclusive (§5.1)
 * - Same-day reading counts as one day to avoid division by zero (§5.1)
 * - Session count is total_sessions_in_cycle (§5.3)
 * - A cycle without sessions has no measurable duration: it must not report
 *   zero days or an invented velocity
 */

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Normalize a date to its calendar day so day counting ignores clock time
 * and daylight-saving offsets.
 * @param {Date|string} value
 * @returns {number}
 */
function toCalendarDayTime(value) {
  const date = value instanceof Date ? value : new Date(value);

  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export class ReadingCycleSummary {
  constructor({
    bookId,
    title,
    author,
    readingCycle,
    finishedAt,
    sessions,
    pagesRead,
    firstSession,
    lastSession,
    totalPages,
    score,
  }) {
    this.bookId = bookId;
    this.title = title;
    this.author = author;
    this.readingCycle = readingCycle;
    this.finishedAt = finishedAt;
    this.sessions = sessions;
    this.pagesRead = pagesRead;
    this.firstSession = firstSession;
    this.lastSession = lastSession;
    this.totalPages = totalPages;
    this.score = score;

    this.hasSessionData =
      sessions > 0 && firstSession !== null && lastSession !== null;

    this.days = this.hasSessionData
      ? ReadingCycleSummary.calculateDays(firstSession, lastSession)
      : null;

    this.pagesPerDay =
      this.hasSessionData && this.days > 0
        ? Math.round((pagesRead / this.days) * 10) / 10
        : null;
  }

  /**
   * Count inclusive calendar days between the first and last session.
   * A same-day cycle counts as one day (DOMAIN.md §5.1).
   * @param {Date|string} firstSession
   * @param {Date|string} lastSession
   * @returns {number}
   */
  static calculateDays(firstSession, lastSession) {
    const elapsed =
      toCalendarDayTime(lastSession) - toCalendarDayTime(firstSession);

    return Math.max(1, Math.round(elapsed / MILLISECONDS_PER_DAY) + 1);
  }

  /**
   * Factory method to create ReadingCycleSummary from a repository row
   * @param {Object} record
   * @returns {ReadingCycleSummary}
   */
  static fromDatabase(record) {
    return new ReadingCycleSummary({
      bookId: record.book_id,
      title: record.title,
      author: record.author_name,
      readingCycle: record.reading_cycle,
      finishedAt: record.finished_at,
      sessions: record.sessions_count,
      pagesRead: record.pages_read,
      firstSession: record.first_session,
      lastSession: record.last_session,
      totalPages: record.total_pages,
      score: record.score,
    });
  }

  /**
   * Convert to JSON representation for API responses
   * @returns {Object}
   */
  toJSON() {
    return {
      book_id: this.bookId,
      title: this.title,
      author: this.author,
      reading_cycle: this.readingCycle,
      finished_at: this.finishedAt,
      sessions: this.sessions,
      days: this.days,
      pages_read: this.pagesRead,
      pages_per_day: this.pagesPerDay,
      total_pages: this.totalPages,
      score: this.score,
      has_session_data: this.hasSessionData,
    };
  }
}
