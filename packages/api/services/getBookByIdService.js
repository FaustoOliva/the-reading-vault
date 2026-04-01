/**
 * GetBookByIdService (Query Use Case)
 * Retrieves detailed information about a single book
 *
 * Responsibilities:
 * - Implement GetBookById use case as defined in USE_CASES.md
 * - Orchestrate repository calls to gather book details and statistics
 * - Calculate derived metrics (velocity, estimated completion)
 * - Return BookDetails structure
 *
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - No transactions needed (read-only operation)
 * - Throws NotFoundError if book doesn't exist
 */

import { NotFoundError } from "../errors/http/NotFoundError.js";

export class GetBookByIdService {
  constructor(bookRepository, readingSessionRepository) {
    this.bookRepository = bookRepository;
    this.readingSessionRepository = readingSessionRepository;
  }

  /**
   * Execute GetBookById use case
   * @param {number} bookId - Book ID
   * @returns {Promise<Object>} BookDetails with statistics
   */
  async execute(bookId) {
    // Get book entity
    const book = await this.bookRepository.getById(bookId);

    if (!book) {
      throw new NotFoundError("Book", bookId);
    }

    // Get current cycle statistics
    const currentCycleStats =
      await this.readingSessionRepository.getCurrentCycleStats(
        bookId,
        book.currentReadingCycle,
      );

    // Get reading cycle history
    const cycleHistory =
      await this.readingSessionRepository.getCycleHistory(bookId);

    // Calculate derived metrics for current cycle
    const currentCycleMetrics = this._calculateCurrentCycleMetrics(
      currentCycleStats,
      book.totalPages,
    );

    // Format cycle history
    const formattedCycleHistory = this._formatCycleHistory(
      cycleHistory,
      book.status,
    );

    // Build complete response
    return {
      book: {
        id: book.id,
        title: book.title,
        isbn: book.isbn,
        bookType: book.bookType,
        genres: book.genres,
        synopsis: book.synopsis,
        publicationYear: book.publicationYear,
        author: {
          id: book.authorId,
          name: book.authorName,
          nationality: book.authorNationality,
          countryIsoCode: book.authorCountryIsoCode,
        },
        total_pages: book.totalPages,
        status: book.status,
        current_reading_cycle: book.currentReadingCycle,
        pages_read_total: this._calculateTotalPagesRead(cycleHistory),
        pages_read_in_current_cycle: currentCycleStats.pages_read,
        score: book.score,
        comment: book.comment,
        created_at: book.createdAt || new Date(),
      },
      current_cycle_stats: {
        sessions_count: currentCycleStats.sessions_count,
        first_session_date: currentCycleStats.first_session_date,
        last_session_date: currentCycleStats.last_session_date,
        days_elapsed: currentCycleMetrics.days_elapsed,
        velocity: currentCycleMetrics.velocity,
        estimated_completion: currentCycleMetrics.estimated_completion,
      },
      reading_cycles: formattedCycleHistory,
    };
  }

  /**
   * Calculate derived metrics for current cycle
   * @private
   */
  _calculateCurrentCycleMetrics(stats, totalPages) {
    let days_elapsed = 0;
    let velocity = null;
    let estimated_completion = null;

    if (stats.first_session_date && stats.last_session_date) {
      const firstDate = new Date(stats.first_session_date);
      const lastDate = new Date(stats.last_session_date);
      days_elapsed =
        Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;

      // Calculate velocity (pages/day)
      if (days_elapsed > 0 && stats.pages_read > 0) {
        velocity = parseFloat((stats.pages_read / days_elapsed).toFixed(2));

        // Calculate estimated completion if we have total_pages and velocity
        if (totalPages && velocity > 0) {
          const remainingPages = totalPages - stats.pages_read;
          if (remainingPages > 0) {
            const today = new Date();
            const daysToComplete = Math.ceil(remainingPages / velocity);

            // Add penalty for inactivity: days since last session
            const daysSinceLastSession = Math.ceil(
              (today - lastDate) / (1000 * 60 * 60 * 24),
            );
            const adjustedDaysToComplete =
              daysToComplete + daysSinceLastSession;

            estimated_completion = new Date(today);
            estimated_completion.setDate(
              estimated_completion.getDate() + adjustedDaysToComplete,
            );
          }
        }
      }
    }

    return {
      days_elapsed,
      velocity,
      estimated_completion,
    };
  }

  /**
   * Format cycle history to match USE_CASES.md structure
   * @private
   */
  _formatCycleHistory(cycleHistory, currentStatus) {
    return cycleHistory.map((cycle) => ({
      cycle_number: cycle.cycle_number,
      status: this._getCycleStatus(
        cycle.cycle_number,
        cycleHistory.length,
        currentStatus,
      ),
      sessions_count: cycle.sessions_count,
      total_pages_read: cycle.total_pages_read,
      first_session: cycle.first_session,
      last_session: cycle.last_session,
      duration_days: cycle.duration_days + 1, // +1 to include both first and last day
    }));
  }

  /**
   * Determine the status of a reading cycle
   * @private
   */
  _getCycleStatus(cycleNumber, totalCycles, currentBookStatus) {
    // If it's the current (last) cycle, use the book's current status
    if (cycleNumber === totalCycles) {
      return currentBookStatus;
    }

    // Previous cycles were abandoned or restarted
    return "READING"; // Historical cycles that led to restarts
  }

  /**
   * Calculate total pages read across all cycles
   * @private
   */
  _calculateTotalPagesRead(cycleHistory) {
    return cycleHistory.reduce((sum, cycle) => sum + cycle.total_pages_read, 0);
  }
}
