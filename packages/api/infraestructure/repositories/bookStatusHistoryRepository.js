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

export class BookStatusHistoryRepository {
  constructor(pgClient) {
    this.pgClient = pgClient;
  }

  /**
   * Create a new status history record within a transaction
   * @param {Object} data - History data
   * @param {PoolClient} transaction - Active transaction
   * @returns {Promise<void>}
   */
  async create(data, transaction) {
    const query = `
      INSERT INTO bookstatushistory (book_id, old_status_id, new_status_id, reading_cycle, created_at)
      VALUES (
        $1,
        (SELECT id FROM bookstatuses WHERE internal_code = $2),
        (SELECT id FROM bookstatuses WHERE internal_code = $3),
        $4,
        NOW()
      )
    `;

    await transaction.query(query, [
      data.bookId,
      data.oldStatus,
      data.newStatus,
      data.readingCycle,
    ]);
  }

  /**
   * Get status history for a book
   * @param {number} bookId - Book ID
   * @returns {Promise<Object[]>}
   */
  async getByBookId(bookId) {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT 
        h.id,
        h.book_id,
        os.internal_code as old_status,
        ns.internal_code as new_status,
        h.reading_cycle,
        h.created_at
      FROM bookstatushistory h
      LEFT JOIN bookstatuses os ON h.old_status_id = os.id
      INNER JOIN bookstatuses ns ON h.new_status_id = ns.id
      WHERE h.book_id = $1
      ORDER BY h.created_at DESC
    `;

    const result = await pool.query(query, [bookId]);

    return result.rows;
  }

  /**
   * Get status transitions for a book (for reading stats)
   * @param {number} bookId - Book ID
   * @returns {Promise<Object[]>} Status transitions with cycle info
   */
  async getTransitionsByBook(bookId) {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT 
        bsh.id,
        "oldStatus".internal_code as "oldStatus",
        "newStatus".internal_code as "newStatus",
        bsh.reading_cycle as "readingCycle",
        bsh.created_at as "createdAt"
      FROM bookstatushistory bsh
      LEFT JOIN bookstatuses "oldStatus" ON bsh.old_status_id = "oldStatus".id
      INNER JOIN bookstatuses "newStatus" ON bsh.new_status_id = "newStatus".id
      WHERE bsh.book_id = $1
      ORDER BY bsh.created_at ASC
    `;

    const result = await pool.query(query, [bookId]);

    return result.rows;
  }
}
