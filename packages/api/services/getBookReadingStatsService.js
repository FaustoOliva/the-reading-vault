/**
 * GetBookReadingStatsService (Query Use Case)
 * Calculates detailed reading statistics for a specific book
 * 
 * Responsibilities:
 * - Implement GetBookReadingStats use case as defined in USE_CASES.md (7.2)
 * - Orchestrate repository calls for book-specific statistics
 * - Calculate cycle-by-cycle breakdown and velocities
 * 
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - No transactions needed (read-only operation)
 * - Throws NotFoundError if book doesn't exist
 */

import { NotFoundError } from "../errors/index.js";

export class GetBookReadingStatsService {
  constructor(bookRepository, readingSessionRepository, bookStatusHistoryRepository) {
    this.bookRepository = bookRepository;
    this.readingSessionRepository = readingSessionRepository;
    this.bookStatusHistoryRepository = bookStatusHistoryRepository;
  }

  /**
   * Execute GetBookReadingStats use case
   * @param {number} bookId - Book ID
   * @returns {Promise<Object>} Detailed book statistics
   */
  async execute(bookId) {
    // Get book
    const book = await this.bookRepository.getById(bookId);
    if (!book) {
      throw new NotFoundError("Book", bookId);
    }

    // Get all statistics in parallel
    const [cycleStats, overallStats, statusHistory] = await Promise.all([
      this.readingSessionRepository.getStatsByBook(bookId),
      this.readingSessionRepository.getOverallStatsByBook(bookId),
      this.bookStatusHistoryRepository.getTransitionsByBook(bookId)
    ]);

    // Calculate current cycle stats
    const currentCycleStats = this._calculateCurrentCycleStats(
      cycleStats,
      book.currentReadingCycle,
      book.totalPages
    );

    // Build cycle history
    const cycleHistory = cycleStats
      .filter(cycle => cycle.cycleNumber < book.currentReadingCycle)
      .map(cycle => this._buildCycleHistoryEntry(cycle, statusHistory));

    return {
      book: {
        id: book.id,
        title: book.title,
        status: book.status,
        current_cycle: book.currentReadingCycle
      },
      overall_stats: {
        total_pages_read: overallStats.totalPagesRead,
        total_sessions: overallStats.totalSessions,
        total_cycles: overallStats.totalCycles,
        first_session: overallStats.firstSession,
        last_session: overallStats.lastSession,
        score: book.score
      },
      current_cycle_stats: currentCycleStats,
      cycle_history: cycleHistory
    };
  }

  /**
   * Calculate statistics for current cycle
   * @private
   */
  _calculateCurrentCycleStats(cycleStats, currentCycle, totalPages) {
    const currentCycleData = cycleStats.find(c => c.cycleNumber === currentCycle);
    
    if (!currentCycleData) {
      return {
        cycle_number: currentCycle,
        pages_read: 0,
        sessions_count: 0,
        first_session: null,
        last_session: null,
        days_elapsed: 0,
        velocity: null,
        velocity_7d: null,
        velocity_30d: null,
        estimated_completion: null,
        progress_percent: null
      };
    }

    const daysElapsed = currentCycleData.durationDays;
    const velocity = daysElapsed > 0 ? currentCycleData.totalPages / daysElapsed : null;
    
    // For simplicity, use overall velocity for 7d and 30d (could be enhanced with date filtering)
    const velocity7d = velocity;
    const velocity30d = velocity;

    let estimatedCompletion = null;
    let progressPercent = null;

    if (totalPages && velocity && velocity > 0) {
      const remainingPages = totalPages - currentCycleData.totalPages;
      const estimatedDaysLeft = remainingPages / velocity;
      
      if (remainingPages > 0) {
        estimatedCompletion = new Date(currentCycleData.lastSession);
        estimatedCompletion.setDate(estimatedCompletion.getDate() + Math.ceil(estimatedDaysLeft));
      }
      
      progressPercent = Math.round((currentCycleData.totalPages / totalPages) * 100 * 10) / 10;
    }

    return {
      cycle_number: currentCycle,
      pages_read: currentCycleData.totalPages,
      sessions_count: currentCycleData.sessions,
      first_session: currentCycleData.firstSession,
      last_session: currentCycleData.lastSession,
      days_elapsed: daysElapsed,
      velocity: velocity ? Math.round(velocity * 10) / 10 : null,
      velocity_7d: velocity7d ? Math.round(velocity7d * 10) / 10 : null,
      velocity_30d: velocity30d ? Math.round(velocity30d * 10) / 10 : null,
      estimated_completion: estimatedCompletion,
      progress_percent: progressPercent
    };
  }

  /**
   * Build cycle history entry
   * @private
   */
  _buildCycleHistoryEntry(cycle, statusHistory) {
    const velocity = cycle.durationDays > 0 ? cycle.totalPages / cycle.durationDays : 0;
    
    // Find completion date for this cycle
    const completionTransition = statusHistory.find(
      h => h.readingCycle === cycle.cycleNumber && 
           (h.newStatus === 'COMPLETED' || h.newStatus === 'ABANDONED' || h.newStatus === 'PENDING_SCORE')
    );

    return {
      cycle_number: cycle.cycleNumber,
      pages_read: cycle.totalPages,
      sessions_count: cycle.sessions,
      first_session: cycle.firstSession,
      last_session: cycle.lastSession,
      duration_days: cycle.durationDays,
      average_velocity: Math.round(velocity * 10) / 10,
      completed: !!completionTransition,
      completion_date: completionTransition ? completionTransition.createdAt : null
    };
  }
}
