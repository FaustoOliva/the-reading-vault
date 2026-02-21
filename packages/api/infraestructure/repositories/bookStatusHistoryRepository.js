/**
 * BookStatusHistoryRepository
 * Handles data persistence operations for BookStatusHistory entity
 * 
 * Responsibilities:
 * - Insert status change history records
 * - Query status history
 * 
 * Rules:
 * - No business logic
 * - No HTTP concerns
 * - Receives DB session/transaction explicitly when needed
 */

import sql from "mssql";

export class BookStatusHistoryRepository {
  constructor(mssqlClient) {
    this.mssqlClient = mssqlClient;
  }

  /**
   * Create a new status history record within a transaction
   * @param {Object} data - History data
   * @param {sql.Transaction} transaction - Active transaction
   * @returns {Promise<void>}
   */
  async create(data, transaction) {
    const query = `
      INSERT INTO BookStatusHistory (book_id, old_status_id, new_status_id, reading_cycle, created_at)
      VALUES (
        @bookId,
        (SELECT id FROM BookStatuses WHERE internal_code = @oldStatus),
        (SELECT id FROM BookStatuses WHERE internal_code = @newStatus),
        @readingCycle,
        GETDATE()
      )
    `;

    await transaction
      .request()
      .input("bookId", sql.Int, data.bookId)
      .input("oldStatus", sql.NVarChar, data.oldStatus)
      .input("newStatus", sql.NVarChar, data.newStatus)
      .input("readingCycle", sql.Int, data.readingCycle)
      .query(query);
  }

  /**
   * Get status history for a book
   * @param {number} bookId - Book ID
   * @returns {Promise<Object[]>}
   */
  async getByBookId(bookId) {
    const pool = await this.mssqlClient.getConnection();
    
    const query = `
      SELECT 
        h.id,
        h.book_id,
        os.internal_code as old_status,
        ns.internal_code as new_status,
        h.reading_cycle,
        h.created_at
      FROM BookStatusHistory h
      LEFT JOIN BookStatuses os ON h.old_status_id = os.id
      INNER JOIN BookStatuses ns ON h.new_status_id = ns.id
      WHERE h.book_id = @bookId
      ORDER BY h.created_at DESC
    `;

    const result = await pool
      .request()
      .input("bookId", sql.Int, bookId)
      .query(query);

    return result.recordset;
  }

  /**
   * Get status transitions for a book (for reading stats)
   * @param {number} bookId - Book ID
   * @returns {Promise<Object[]>} Status transitions with cycle info
   */
  async getTransitionsByBook(bookId) {
    const pool = await this.mssqlClient.getConnection();
    
    const query = `
      SELECT 
        bsh.id,
        oldStatus.internal_code as oldStatus,
        newStatus.internal_code as newStatus,
        bsh.reading_cycle as readingCycle,
        bsh.created_at as createdAt
      FROM BookStatusHistory bsh
      LEFT JOIN BookStatuses oldStatus ON bsh.old_status_id = oldStatus.id
      INNER JOIN BookStatuses newStatus ON bsh.new_status_id = newStatus.id
      WHERE bsh.book_id = @bookId
      ORDER BY bsh.created_at ASC
    `;
    
    const result = await pool
      .request()
      .input("bookId", sql.Int, bookId)
      .query(query);
    
    return result.recordset;
  }
}
