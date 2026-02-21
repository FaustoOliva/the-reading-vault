/**
 * CalculateReadingKPIService (Query Use Case)
 * Calculates global reading metrics across all books and cycles
 * 
 * Responsibilities:
 * - Implement CalculateReadingKPIs use case as defined in USE_CASES.md (7.1)
 * - Orchestrate repository calls for KPI aggregation
 * - Calculate derived metrics (velocities, streaks, rates)
 * 
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - No transactions needed (read-only operation)
 * - Returns computed KPIs object
 */

export class CalculateReadingKPIService {
  constructor(bookRepository, readingSessionRepository) {
    this.bookRepository = bookRepository;
    this.readingSessionRepository = readingSessionRepository;
  }

  /**
   * Execute CalculateReadingKPIs use case
   * @param {Object} filters - Optional filters { date_from?, date_to? }
   * @returns {Promise<Object>} KPIs and period information
   */
  async execute(filters = {}) {
    // Get aggregated data from repositories
    const [bookStats, sessionStats, sessionDates, avgDaysToComplete] = await Promise.all([
      this.bookRepository.calculateGlobalKPIs(),
      this.readingSessionRepository.calculateGlobalMetrics(),
      this.readingSessionRepository.getAllSessionDates(),
      this.bookRepository.getAverageDaysToComplete()
    ]);

    // Calculate period
    const period = this._calculatePeriod(sessionStats.firstSessionDate, filters);

    // Calculate derived metrics
    const currentStreak = this._calculateCurrentStreak(sessionDates);
    const longestStreak = this._calculateLongestStreak(sessionDates);
    
    const averagePagesPerSession = sessionStats.totalSessions > 0
      ? sessionStats.totalPages / sessionStats.totalSessions
      : 0;
    
    const averageSessionsPerDay = period.days > 0
      ? sessionStats.totalSessions / period.days
      : 0;
    
    const averagePagesPerDay = period.days > 0
      ? sessionStats.totalPages / period.days
      : 0;
    
    const consistencyRate = period.days > 0
      ? sessionStats.readingDays / period.days
      : 0;

    // Calculate completion rate (excludes WISH_LIST books)
    const booksStarted = bookStats.total - bookStats.wishList;
    const completionRate = booksStarted > 0
      ? bookStats.completed / booksStarted
      : 0;

    return {
      kpis: {
        // Volume metrics
        total_books: bookStats.total,
        books_completed: bookStats.completed,
        books_in_progress: bookStats.reading + bookStats.pendingScore,
        books_abandoned: bookStats.abandoned,
        
        // Reading activity
        total_sessions: sessionStats.totalSessions,
        total_pages_read: sessionStats.totalPages,
        
        // Averages
        average_pages_per_session: Math.round(averagePagesPerSession * 10) / 10,
        average_sessions_per_day: Math.round(averageSessionsPerDay * 100) / 100,
        average_pages_per_day: Math.round(averagePagesPerDay * 10) / 10,
        
        // Velocity & consistency
        current_streak: currentStreak,
        longest_streak: longestStreak,
        reading_days: sessionStats.readingDays,
        consistency_rate: Math.round(consistencyRate * 1000) / 1000,
        
        // Completion metrics
        completion_rate: Math.round(completionRate * 1000) / 1000,
        average_days_to_complete: avgDaysToComplete ? Math.round(avgDaysToComplete) : null,
        
        // Score analytics
        average_score: bookStats.avgScore ? Math.round(bookStats.avgScore * 10) / 10 : null,
        books_rated: bookStats.booksRated
      },
      period: {
        from: period.from,
        to: period.to,
        days: period.days
      }
    };
  }

  /**
   * Calculate period based on filters or session dates
   * @private
   */
  _calculatePeriod(firstSessionDate, filters) {
    const now = new Date();
    const from = filters.date_from ? new Date(filters.date_from) : (firstSessionDate || now);
    const to = filters.date_to ? new Date(filters.date_to) : now;
    
    const diffTime = Math.abs(to - from);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    return { from, to, days };
  }

  /**
   * Calculate current reading streak (consecutive days from today)
   * @private
   */
  _calculateCurrentStreak(sessionDates) {
    if (sessionDates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if there's a session today or yesterday (allows 1-day gap)
    const mostRecentDate = new Date(sessionDates[0]);
    mostRecentDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - mostRecentDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 1) {
      return 0; // Streak broken
    }

    // Count consecutive days backwards
    for (let i = 0; i < sessionDates.length; i++) {
      const currentDate = new Date(sessionDates[i]);
      currentDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - streak);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (currentDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (currentDate < expectedDate) {
        break; // Gap found
      }
    }

    return streak;
  }

  /**
   * Calculate longest reading streak in dataset
   * @private
   */
  _calculateLongestStreak(sessionDates) {
    if (sessionDates.length === 0) return 0;

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 0; i < sessionDates.length - 1; i++) {
      const current = new Date(sessionDates[i]);
      const next = new Date(sessionDates[i + 1]);
      
      current.setHours(0, 0, 0, 0);
      next.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((current - next) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return maxStreak;
  }
}
