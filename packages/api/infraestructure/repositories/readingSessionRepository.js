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

import sql from "mssql";
import { ReadingSession } from "../../models/ReadingSession.js";

export class ReadingSessionRepository {
  constructor(mssqlClient) {
    this.mssqlClient = mssqlClient;
  }

  /**
   * Create a new reading session within a transaction
   * @param {Object} data - Session data
   * @param {sql.Transaction} transaction - Active transaction
   * @returns {Promise<ReadingSession>}
   */
  async create(data, transaction) {
    const query = `
      INSERT INTO ReadingSessions (book_id, pages_read, reading_cycle, occurred_at, created_at)
      OUTPUT INSERTED.*
      VALUES (@bookId, @pagesRead, @readingCycle, @occurredAt, GETDATE())
    `;

    const result = await transaction
      .request()
      .input("bookId", sql.Int, data.bookId)
      .input("pagesRead", sql.Int, data.pagesRead)
      .input("readingCycle", sql.Int, data.readingCycle)
      .input("occurredAt", sql.DateTime, data.occurredAt || new Date())
      .query(query);

    return ReadingSession.fromDatabase(result.recordset[0]);
  }

  /**
   * Get all sessions for a book
   * @param {number} bookId - Book ID
   * @returns {Promise<ReadingSession[]>}
   */
  async getByBookId(bookId) {
    const pool = await this.mssqlClient.getConnection();
    
    const query = `
      SELECT 
        id,
        book_id,
        reading_cycle,
        pages_read,
        occurred_at,
        created_at
      FROM ReadingSessions
      WHERE book_id = @bookId
      ORDER BY occurred_at DESC
    `;

    const result = await pool
      .request()
      .input("bookId", sql.Int, bookId)
      .query(query);

    return result.recordset.map(record => ReadingSession.fromDatabase(record));
  }

  /**
   * Get total pages read in current cycle for a book
   * @param {number} bookId - Book ID
   * @param {number} currentCycle - Current reading cycle
   * @returns {Promise<number>}
   */
  async getTotalPagesInCycle(bookId, currentCycle) {
    const pool = await this.mssqlClient.getConnection();
    
    const query = `
      SELECT ISNULL(SUM(pages_read), 0) as total
      FROM ReadingSessions
      WHERE book_id = @bookId AND reading_cycle = @cycle
    `;

    const result = await pool
      .request()
      .input("bookId", sql.Int, bookId)
      .input("cycle", sql.Int, currentCycle)
      .query(query);

    return result.recordset[0].total;
  }

  /**
   * Get current cycle statistics for a book
   * @param {number} bookId - Book ID
   * @param {number} currentCycle - Current reading cycle
   * @returns {Promise<Object>} Current cycle stats
   */
  async getCurrentCycleStats(bookId, currentCycle) {
    const pool = await this.mssqlClient.getConnection();
    
    const query = `
      SELECT 
        COUNT(*) as sessions_count,
        MIN(occurred_at) as first_session_date,
        MAX(occurred_at) as last_session_date,
        ISNULL(SUM(pages_read), 0) as pages_read
      FROM ReadingSessions
      WHERE book_id = @bookId AND reading_cycle = @currentCycle
    `;

    const result = await pool
      .request()
      .input("bookId", sql.Int, bookId)
      .input("currentCycle", sql.Int, currentCycle)
      .query(query);

    const record = result.recordset[0];

    return {
      sessions_count: record.sessions_count,
      first_session_date: record.first_session_date,
      last_session_date: record.last_session_date,
      pages_read: record.pages_read
    };
  }

  /**
   * Get reading cycle history for a book
   * @param {number} bookId - Book ID
   * @returns {Promise<Array>} Reading cycle summaries
   */
  async getCycleHistory(bookId) {
    const pool = await this.mssqlClient.getConnection();
    
    const query = `
      SELECT 
        reading_cycle as cycle_number,
        COUNT(*) as sessions_count,
        SUM(pages_read) as total_pages_read,
        MIN(occurred_at) as first_session,
        MAX(occurred_at) as last_session,
        DATEDIFF(DAY, MIN(occurred_at), MAX(occurred_at)) as duration_days
      FROM ReadingSessions
      WHERE book_id = @bookId
      GROUP BY reading_cycle
      ORDER BY reading_cycle ASC
    `;

    const result = await pool
      .request()
      .input("bookId", sql.Int, bookId)
      .query(query);

    return result.recordset;
  }
}
