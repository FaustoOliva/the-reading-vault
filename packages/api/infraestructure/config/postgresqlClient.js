import { Pool } from "pg";

/**
 * PostgreSQL Client
 *
 * Adapter layer for PostgreSQL database connections.
 * Encapsulates connection lifecycle to decouple business logic from infrastructure.
 */

export class PostgreSQLClient {
  constructor(config) {
    this.config = config;
    this.pool = null;
  }

  /**
   * Establishes connection pool to PostgreSQL
   *
   * @returns {Promise<void>}
   * @throws {Error} If connection fails
   */
  async connect() {
    try {
      this.pool = new Pool({
        user: this.config.user,
        password: this.config.password,
        host: this.config.server,
        port: this.config.port,
        database: this.config.database,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test the connection
      const client = await this.pool.connect();
      client.release();

      console.log("PostgreSQL connected");
    } catch (error) {
      console.error("PostgreSQL connection failed:", error.message);
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
        await this.pool.end();
        this.pool = null;
        console.log("PostgreSQL disconnected");
      }
    } catch (error) {
      console.error("PostgreSQL disconnection failed:", error.message);
      throw error;
    }
  }

  /**
   * Returns active connection pool
   *
   * @returns {Pool|null}
   */
  getPool() {
    return this.pool;
  }

  /**
   * Returns active connection pool (alias for getPool)
   * Ensures connection is established before returning
   *
   * @returns {Pool}
   * @throws {Error} If not connected
   */
  getConnection() {
    if (!this.pool) {
      throw new Error(
        "Database connection not established. Call connect() first.",
      );
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

  /**
   * Execute a query with PostgreSQL syntax
   *
   * @param {string} query - SQL query string
   * @param {Array} values - Query parameters (for parameterized queries)
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(query, values = []) {
    try {
      const client = await this.getConnection().connect();
      try {
        const result = await client.query(query, values);
        return result;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Query execution failed:", error.message);
      throw error;
    }
  }

  /**
   * Begin a transaction
   *
   * @returns {Promise<PoolClient>}
   */
  async beginTransaction() {
    const client = await this.getConnection().connect();
    await client.query("BEGIN");
    return client;
  }
}
