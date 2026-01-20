import DatabaseConfig from "../../infrastructure/database/DatabaseConfig";

/**
 * KPI Calculation Utility
 *
 * Implements velocity and reading streak calculations per BusinessRules.md Section 5.
 * All calculations are cycle-specific to ensure accurate KPI history.
 */
export class KPICalculator {
  /**
   * Calculate velocity for current reading cycle.
   *
   * Formula: velocity = total_pages_in_cycle / days_elapsed
   * Day 0 Handling: days_elapsed = MAX(1, latest_date - earliest_date + 1)
   *
   * @param bookId - Book identifier
   * @param currentCycle - Current reading cycle number
   * @returns Velocity in pages per day (float)
   */
  static async calculateCurrentCycleVelocity(
    bookId: number,
    currentCycle: number
  ): Promise<number> {
    const pool = await DatabaseConfig.getPool();
    const result = await pool
      .request()
      .input("book_id", bookId)
      .input("reading_cycle", currentCycle)
      .query(
        `
        SELECT 
          SUM(pages_read) AS total_pages,
          DATEDIFF(DAY, MIN(CAST(occurred_at AS DATE)), MAX(CAST(occurred_at AS DATE))) + 1 AS days_elapsed
        FROM ReadingSessions
        WHERE book_id = @book_id AND reading_cycle = @reading_cycle
      `
      );

    if (!result.recordset || result.recordset.length === 0) return 0;

    const row = result.recordset[0];
    const totalPages = row.total_pages ?? 0;
    const daysElapsed = row.days_elapsed ?? 1;

    // Day 0 handling: treat single-day reading as 1 day
    const safeDaysElapsed = Math.max(1, daysElapsed);

    return Number((totalPages / safeDaysElapsed).toFixed(2));
  }

  /**
   * Calculate 7-day moving average velocity.
   *
   * Sums pages read in the last 7 calendar days (current cycle only).
   *
   * @param bookId - Book identifier
   * @param currentCycle - Current reading cycle number
   * @returns Velocity in pages per day (float)
   */
  static async calculate7DayVelocity(
    bookId: number,
    currentCycle: number
  ): Promise<number> {
    const pool = await DatabaseConfig.getPool();
    const result = await pool
      .request()
      .input("book_id", bookId)
      .input("reading_cycle", currentCycle)
      .input(
        "sevenDaysAgo",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      )
      .query(
        `
        SELECT SUM(pages_read) AS total_pages
        FROM ReadingSessions
        WHERE book_id = @book_id 
          AND reading_cycle = @reading_cycle 
          AND CAST(occurred_at AS DATE) >= CAST(@sevenDaysAgo AS DATE)
      `
      );

    if (!result.recordset || result.recordset.length === 0) return 0;

    const totalPages = result.recordset[0].total_pages ?? 0;
    return Number((totalPages / 7).toFixed(2));
  }

  /**
   * Calculate 30-day moving average velocity.
   *
   * Sums pages read in the last 30 calendar days (current cycle only).
   *
   * @param bookId - Book identifier
   * @param currentCycle - Current reading cycle number
   * @returns Velocity in pages per day (float)
   */
  static async calculate30DayVelocity(
    bookId: number,
    currentCycle: number
  ): Promise<number> {
    const pool = await DatabaseConfig.getPool();
    const result = await pool
      .request()
      .input("book_id", bookId)
      .input("reading_cycle", currentCycle)
      .input(
        "thirtyDaysAgo",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
      .query(
        `
        SELECT SUM(pages_read) AS total_pages
        FROM ReadingSessions
        WHERE book_id = @book_id 
          AND reading_cycle = @reading_cycle 
          AND CAST(occurred_at AS DATE) >= CAST(@thirtyDaysAgo AS DATE)
      `
      );

    if (!result.recordset || result.recordset.length === 0) return 0;

    const totalPages = result.recordset[0].total_pages ?? 0;
    return Number((totalPages / 30).toFixed(2));
  }

  /**
   * Calculate estimated completion date.
   *
   * Formula: today + (remaining_pages / velocity_current_cycle)
   *
   * @param remainingPages - Pages left to read
   * @param velocityCurrentCycle - Pages per day velocity
   * @returns Estimated completion date or null if velocity is 0
   */
  static calculateEstimatedCompletionDate(
    remainingPages: number,
    velocityCurrentCycle: number
  ): Date | null {
    if (velocityCurrentCycle === 0) return null;

    const daysToCompletion = remainingPages / velocityCurrentCycle;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysToCompletion);

    return completionDate;
  }

  /**
   * Calculate reading streak (consecutive days with at least one session).
   *
   * @param bookId - Book identifier
   * @param currentCycle - Current reading cycle number
   * @returns Number of consecutive days with reading sessions
   */
  static async calculateReadingStreak(
    bookId: number,
    currentCycle: number
  ): Promise<number> {
    const pool = await DatabaseConfig.getPool();
    const result = await pool
      .request()
      .input("book_id", bookId)
      .input("reading_cycle", currentCycle)
      .query(
        `
        WITH SessionDates AS (
          SELECT DISTINCT CAST(occurred_at AS DATE) AS session_date
          FROM ReadingSessions
          WHERE book_id = @book_id AND reading_cycle = @reading_cycle
          ORDER BY session_date DESC
        ),
        Streaks AS (
          SELECT 
            session_date,
            ROW_NUMBER() OVER (ORDER BY session_date DESC) AS rn,
            DATEDIFF(DAY, session_date, LAG(session_date) OVER (ORDER BY session_date DESC)) AS day_gap
          FROM SessionDates
        )
        SELECT COUNT(*) AS streak_length
        FROM Streaks
        WHERE day_gap IS NULL OR day_gap = 1
      `
      );

    if (!result.recordset || result.recordset.length === 0) return 0;

    return result.recordset[0].streak_length ?? 0;
  }

  /**
   * Get total sessions in current cycle.
   *
   * @param bookId - Book identifier
   * @param currentCycle - Current reading cycle number
   * @returns Count of active reading sessions
   */
  static async getTotalSessionsInCycle(
    bookId: number,
    currentCycle: number
  ): Promise<number> {
    const pool = await DatabaseConfig.getPool();
    const result = await pool
      .request()
      .input("book_id", bookId)
      .input("reading_cycle", currentCycle)
      .query(
        `
        SELECT COUNT(*) AS session_count
        FROM ReadingSessions
        WHERE book_id = @book_id AND reading_cycle = @reading_cycle
      `
      );

    if (!result.recordset || result.recordset.length === 0) return 0;

    return result.recordset[0].session_count ?? 0;
  }
}

export default KPICalculator;
