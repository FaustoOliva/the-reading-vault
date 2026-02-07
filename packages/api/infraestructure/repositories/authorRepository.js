/**
 * AuthorRepository
 * Handles data persistence operations for Author entity
 * 
 * Responsibilities:
 * - Query authors from database
 * - Create new authors
 * 
 * Rules:
 * - No business logic
 * - No HTTP concerns
 * - Receives DB session/transaction explicitly when needed
 */

import sql from "mssql";

export class AuthorRepository {
  constructor(mssqlClient) {
    this.mssqlClient = mssqlClient;
  }

  /**
   * Find author by name (case-insensitive)
   * @param {string} name - Author name
   * @returns {Promise<{id: number, name: string, nationalityId: number | null} | null>}
   */
  async findByName(name) {
    const pool = await this.mssqlClient.getConnection();
    
    const result = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .query(`
        SELECT id, name, nationality_id AS nationalityId
        FROM Authors
        WHERE LOWER(name) = LOWER(@name)
      `);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  /**
   * Create a new author
   * @param {Object} data - { name, nationalityId }
   * @param {sql.Transaction} transaction - Required transaction
   * @returns {Promise<{id: number, name: string, nationalityId: number | null}>}
   */
  async create(data, transaction) {
    const { name, nationalityId } = data;
    
    const request = new sql.Request(transaction);
    
    const result = await request
      .input("name", sql.NVarChar, name)
      .input("nationalityId", sql.Int, nationalityId || null)
      .query(`
        INSERT INTO Authors (name, nationality_id)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.nationality_id AS nationalityId
        VALUES (@name, @nationalityId)
      `);

    return result.recordset[0];
  }
}
