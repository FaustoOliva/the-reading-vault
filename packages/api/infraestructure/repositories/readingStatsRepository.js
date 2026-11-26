/**
 * ReadingStatsRepository
 * Handles read-model queries for aggregated reading statistics
 *
 * Responsibilities:
 * - Query finished reading cycles for a given year
 * - Query the reading days and available years behind those finishes
 *
 * Rules:
 * - No business logic (inclusive day counting and velocities live in models)
 * - No HTTP concerns
 * - Read-only projections: the service composes them into domain entities
 */

import sql from "mssql";

/**
 * Finished cycles are cycles that reached review (PENDING_SCORE).
 * Books imported directly as COMPLETED have no PENDING_SCORE event, so they
 * are excluded by construction instead of by a special case.
 */
const FINISHED_CYCLES_CTE = `
  WITH finished_cycles AS (
    SELECT
      bsh.book_id,
      bsh.reading_cycle,
      MIN(bsh.created_at) AS finished_at
    FROM BookStatusHistory bsh
    INNER JOIN BookStatuses ns ON bsh.new_status_id = ns.id
    WHERE ns.internal_code = 'PENDING_SCORE'
    GROUP BY bsh.book_id, bsh.reading_cycle
  )
`;

export class ReadingStatsRepository {
  constructor(mssqlClient) {
    this.mssqlClient = mssqlClient;
  }

  /**
   * Get every finished cycle of a year with its raw effort counters
   * @param {number} year - Calendar year of the finish (PENDING_SCORE date)
   * @returns {Promise<Array<Object>>} Finished cycles, most recent finish first
   */
  async getFinishedCyclesByYear(year) {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      ${FINISHED_CYCLES_CTE}
      SELECT
        b.id AS book_id,
        b.title,
        a.name AS author_name,
        fc.reading_cycle,
        fc.finished_at,
        b.total_pages,
        b.score,
        cycle_stats.sessions_count,
        cycle_stats.pages_read,
        cycle_stats.first_session,
        cycle_stats.last_session
      FROM finished_cycles fc
      INNER JOIN Books b ON b.id = fc.book_id
      INNER JOIN Authors a ON a.id = b.author_id
      OUTER APPLY (
        SELECT
          COUNT(*) AS sessions_count,
          ISNULL(SUM(rs.pages_read), 0) AS pages_read,
          MIN(rs.occurred_at) AS first_session,
          MAX(rs.occurred_at) AS last_session
        FROM ReadingSessions rs
        WHERE rs.book_id = fc.book_id
          AND rs.reading_cycle = fc.reading_cycle
      ) cycle_stats
      WHERE YEAR(fc.finished_at) = @year
      ORDER BY fc.finished_at DESC, b.title ASC
    `;

    const result = await pool
      .request()
      .input("year", sql.Int, year)
      .query(query);

    return result.recordset;
  }

  /**
   * Get the distinct calendar dates read inside the finished cycles of a year
   * @param {number} year - Calendar year of the finish (PENDING_SCORE date)
   * @returns {Promise<Date[]>} Distinct session dates
   */
  async getReadingDaysInFinishedCycles(year) {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      ${FINISHED_CYCLES_CTE}
      SELECT DISTINCT CAST(rs.occurred_at AS DATE) AS session_date
      FROM ReadingSessions rs
      INNER JOIN finished_cycles fc
        ON fc.book_id = rs.book_id
        AND fc.reading_cycle = rs.reading_cycle
      WHERE YEAR(fc.finished_at) = @year
    `;

    const result = await pool
      .request()
      .input("year", sql.Int, year)
      .query(query);

    return result.recordset.map((record) => record.session_date);
  }

  /**
   * Get the pages logged per month of a year across every reading session.
   * Scope: sessions are selected by their reading date, not by the book
   * status or by the reading cycle finish, so books still in progress and
   * later-abandoned books are included. ReadingSessions rows are never
   * soft-deleted in this schema, so no deletion filter applies.
   * @param {number} year - Calendar year of the session reading date
   * @returns {Promise<Array<{month_number: number, pages_read: number}>>} Sparse monthly rows
   */
  async getMonthlyReadingActivity(year) {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT
        MONTH(rs.occurred_at) AS month_number,
        ISNULL(SUM(rs.pages_read), 0) AS pages_read
      FROM ReadingSessions rs
      WHERE YEAR(rs.occurred_at) = @year
      GROUP BY MONTH(rs.occurred_at)
      ORDER BY month_number ASC
    `;

    const result = await pool
      .request()
      .input("year", sql.Int, year)
      .query(query);

    return result.recordset;
  }

  /**
   * Get every year that contains at least one finished cycle
   * @returns {Promise<number[]>} Years, newest first
   */
  async getFinishedCycleYears() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT DISTINCT YEAR(bsh.created_at) AS finish_year
      FROM BookStatusHistory bsh
      INNER JOIN BookStatuses ns ON bsh.new_status_id = ns.id
      WHERE ns.internal_code = 'PENDING_SCORE'
      ORDER BY finish_year DESC
    `;

    const result = await pool.request().query(query);

    return result.recordset.map((record) => record.finish_year);
  }
}
