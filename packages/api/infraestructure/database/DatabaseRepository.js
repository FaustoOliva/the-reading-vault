/**
 * Database Repository
 *
 * Adapter layer providing query interface to business logic.
 * Isolates infrastructure details (SQL syntax) from use cases.
 */

export class DatabaseRepository {
  constructor(pgClient) {
    this.pgClient = pgClient;
  }

  /**
   * Get connection pool
   * @returns {Pool}
   */
  getConnection() {
    const pool = this.pgClient.getPool();
    if (!pool) {
      throw new Error(
        "Database connection not established. Call connect() first.",
      );
    }
    return pool;
  }

  /**
   * Execute raw query
   * @param {string} query - SQL query string
   * @param {Array} params - Query parameters (positional)
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(query, params = []) {
    try {
      const pool = this.getConnection();
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error("Query execution failed:", error.message);
      throw error;
    }
  }
}
