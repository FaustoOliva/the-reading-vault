/**
 * ReadingSessionRepository
 * Handles data persistence operations for ReadingSession entity
 *
 * Responsibilities:
 * - Insert reading sessions into database
 * - Query reading sessions
 * - Translate DB records into ReadingSession domain entities
 *
 * Rules:
 * - No business logic
 * - No HTTP concerns
 * - Receives DB session/transaction explicitly when needed
 */

import { ReadingSession } from "../../models/ReadingSession.js";

export class ReadingSessionRepository {
  constructor(pgClient) {
    this.pgClient = pgClient;
  }

  /**
   * Create a new reading session within a transaction
   * @param {Object} data - Session data
   * @param {PoolClient} transaction - Active transaction
   * @returns {Promise<ReadingSession>}
   */
  async create(data, transaction) {
    const query = `
      INSERT INTO readingsessions (book_id, pages_read, reading_cycle, occurred_at, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    const result = await transaction.query(query, [
      data.bookId,
      data.pagesRead,
      data.readingCycle,
      data.occurredAt || new Date(),
    ]);

    return ReadingSession.fromDatabase(result.rows[0]);
  }

  /**
   * Get all sessions for a book
   * @param {number} bookId - Book ID
   * @returns {Promise<ReadingSession[]>}
   */
  async getByBookId(bookId) {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT 
        id,
        book_id,
        reading_cycle,
        pages_read,
        occurred_at,
        created_at
      FROM readingsessions
      WHERE book_id = $1
      ORDER BY occurred_at DESC
    `;

    const result = await pool.query(query, [bookId]);

    return result.rows.map((record) => ReadingSession.fromDatabase(record));
  }

  /**
   * Get total pages read in current cycle for a book
   * @param {number} bookId - Book ID
   * @param {number} currentCycle - Current reading cycle
   * @returns {Promise<number>}
   */
  async getTotalPagesInCycle(bookId, currentCycle) {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT COALESCE(SUM(pages_read), 0) as total
      FROM readingsessions
      WHERE book_id = $1 AND reading_cycle = $2
    `;

    const result = await pool.query(query, [bookId, currentCycle]);

    return result.rows[0].total;
  }

  /**
   * Get current cycle statistics for a book
   * @param {number} bookId - Book ID
   * @param {number} currentCycle - Current reading cycle
   * @returns {Promise<Object>} Current cycle stats
   */
  async getCurrentCycleStats(bookId, currentCycle) {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT 
        COUNT(*) as sessions_count,
        MIN(occurred_at) as first_session_date,
        MAX(occurred_at) as last_session_date,
        COALESCE(SUM(pages_read), 0) as pages_read
      FROM readingsessions
      WHERE book_id = $1 AND reading_cycle = $2
    `;

    const result = await pool.query(query, [bookId, currentCycle]);

    const record = result.rows[0];

    return {
      sessions_count: parseInt(record.sessions_count),
      first_session_date: record.first_session_date,
      last_session_date: record.last_session_date,
      pages_read: parseInt(record.pages_read),
    };
  }

  /**
   * Get reading cycle history for a book
   * @param {number} bookId - Book ID
   * @returns {Promise<Array>} Reading cycle summaries
   */
  async getCycleHistory(bookId) {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT 
        reading_cycle as cycle_number,
        COUNT(*) as sessions_count,
        SUM(pages_read) as total_pages_read,
        MIN(occurred_at) as first_session,
        MAX(occurred_at) as last_session,
        EXTRACT(DAY FROM (MAX(occurred_at) - MIN(occurred_at))) as duration_days
      FROM readingsessions
      WHERE book_id = $1
      GROUP BY reading_cycle
      ORDER BY reading_cycle ASC
    `;

    const result = await pool.query(query, [bookId]);

    return result.rows;
  }

  /**
   * Calculate global reading session metrics
   * No transaction needed (read-only)
   * @returns {Promise<Object>} Global session statistics
   */
  async calculateGlobalMetrics() {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT 
        COUNT(*) as "totalSessions",
        COALESCE(SUM(pages_read), 0) as "totalPages",
        COUNT(DISTINCT book_id) as "booksWithSessions",
        MIN(occurred_at) as "firstSessionDate",
        MAX(occurred_at) as "lastSessionDate",
        COUNT(DISTINCT DATE(occurred_at)) as "readingDays"
      FROM readingsessions
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  /**
   * Get all sessions ordered by date (for streak calculation)
   * @returns {Promise<Array>} Sessions with dates
   */
  async getAllSessionDates() {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT DISTINCT DATE(occurred_at) as session_date
      FROM readingsessions
      ORDER BY session_date DESC
    `;

    const result = await pool.query(query);
    return result.rows.map((r) => r.session_date);
  }

  /**
   * Get reading statistics by book (cycle breakdown)
   * @param {number} bookId - Book ID
   * @returns {Promise<Array>} Cycle statistics
   */
  async getStatsByBook(bookId) {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT 
        reading_cycle as "cycleNumber",
        MIN(occurred_at) as "firstSession",
        MAX(occurred_at) as "lastSession",
        SUM(pages_read) as "totalPages",
        COUNT(*) as sessions,
        EXTRACT(DAY FROM (MAX(occurred_at) - MIN(occurred_at))) + 1 as "durationDays"
      FROM readingsessions
      WHERE book_id = $1
      GROUP BY reading_cycle
      ORDER BY reading_cycle ASC
    `;

    const result = await pool.query(query, [bookId]);

    return result.rows;
  }

  /**
   * Get overall stats for a specific book (all cycles aggregated)
   * @param {number} bookId - Book ID
   * @returns {Promise<Object>} Overall statistics
   */
  async getOverallStatsByBook(bookId) {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT 
        COALESCE(SUM(pages_read), 0) as "totalPagesRead",
        COUNT(*) as "totalSessions",
        COUNT(DISTINCT reading_cycle) as "totalCycles",
        MIN(occurred_at) as "firstSession",
        MAX(occurred_at) as "lastSession"
      FROM readingsessions
      WHERE book_id = $1
    `;

    const result = await pool.query(query, [bookId]);

    return result.rows[0];
  }
}
