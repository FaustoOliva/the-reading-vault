import sql from "mssql";

/**
 * MSSQL Client
 *
 * Adapter layer for SQL Server database connections.
 * Encapsulates connection lifecycle to decouple business logic from infrastructure.
 */

export class MSSQLClient {
  constructor(config) {
    this.config = config;
    this.pool = null;
  }

  /**
   * Establishes connection pool to SQL Server
   *
   * @returns {Promise<void>}
   * @throws {Error} If connection fails
   */
  async connect() { 
    try {
      this.pool = new sql.ConnectionPool(this.config);
      await this.pool.connect();
      console.log("MSSQL connected");
    } catch (error) {
      console.error("MSSQL connection failed:", error.message);
      throw error;
    }
  }

  /**
   * Closes connection pool gracefully
   *
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        console.log("MSSQL disconnected");
      }
    } catch (error) {
      console.error("MSSQL disconnection failed:", error.message);
      throw error;
    }
  }

  /**
   * Returns active connection pool
   *
   * @returns {sql.ConnectionPool|null}
   */
  getPool() {
    return this.pool;
  }

  /**
   * Returns active connection pool (alias for getPool)
   * Ensures connection is established before returning
   *
   * @returns {sql.ConnectionPool}
   * @throws {Error} If not connected
   */
  getConnection() {
    if (!this.pool) {
      throw new Error("Database connection not established. Call connect() first.");
    }
    return this.pool;
  }

  /**
   * Checks if connected
   *
   * @returns {boolean}
   */
  isConnected() {
    return this.pool !== null;
  }
}
