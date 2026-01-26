/**
 * Database Repository
 * 
 * Adapter layer providing query interface to business logic.
 * Isolates infrastructure details (SQL syntax) from use cases.
 */

export class DatabaseRepository {
  constructor(mssqlClient) {
    this.mssqlClient = mssqlClient;
  }

  /**
   * Get connection pool
   * @returns {Promise<sql.ConnectionPool>}
   */
  getConnection() {
    const pool = this.mssqlClient.getPool();
    if (!pool) {
      throw new Error("Database connection not established. Call connect() first.");
    }
    return pool;
  }

  /**
   * Execute raw query
   * @param {string} query - SQL query string
   * @param {Object} inputs - Named parameters
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(query, inputs = {}) {
    try {
      const request = this.getConnection().request();
      
      // Bind all input parameters
      Object.entries(inputs).forEach(([key, value]) => {
        request.input(key, value);
      });

      const result = await request.query(query);
      return result;
    } catch (error) {
      console.error("Query execution failed:", error.message);
      throw error;
    }
  }

  /**
   * Execute stored procedure
   * @param {string} procedureName - Stored procedure name
   * @param {Object} inputs - Named parameters
   * @returns {Promise<Object>} Execution result
   */
  async executeStoredProcedure(procedureName, inputs = {}) {
    try {
      const request = this.getConnection().request();
      
      Object.entries(inputs).forEach(([key, value]) => {
        request.input(key, value);
      });

      const result = await request.execute(procedureName);
      return result;
    } catch (error) {
      console.error("Stored procedure execution failed:", error.message);
      throw error;
    }
  }
}
