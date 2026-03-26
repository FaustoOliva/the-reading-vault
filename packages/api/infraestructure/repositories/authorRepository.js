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
   * Get a single author by ID
   * @param {number} authorId - Author ID
   * @returns {Promise<{id: number, name: string, nationality: string | null} | null>}
   */
  async getById(authorId) {
    const pool = await this.mssqlClient.getConnection();

    const result = await pool.request().input("authorId", sql.Int, authorId)
      .query(`
        SELECT
          A.id,
          A.name,
          C.name AS nationality
        FROM Authors A
        LEFT JOIN Countries C ON A.nationality_id = C.id
        WHERE A.id = @authorId
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0];
  }

  /**
   * Get all authors with optional name filtering, sorted alphabetically
   * @param {Object} filters - Optional filters { nameLike }
   * @returns {Promise<Array<{id: number, name: string, nationality: string | null}>>}
   */
  async getAll(filters = {}) {
    const pool = await this.mssqlClient.getConnection();
    const request = pool.request();

    let whereClause = "";

    if (filters.nameLike) {
      whereClause = "WHERE A.name LIKE @nameLike";
      request.input("nameLike", sql.NVarChar, `%${filters.nameLike}%`);
    }

    const result = await request.query(`
      SELECT 
        A.id,
        A.name,
        C.name AS nationality
      FROM Authors A
      LEFT JOIN Countries C ON A.nationality_id = C.id
      ${whereClause}
      ORDER BY A.name ASC
    `);

    return result.recordset;
  }

  /**
   * Find author by name (case-insensitive)
   * @param {string} name - Author name
   * @returns {Promise<{id: number, name: string, nationalityId: number | null} | null>}
   */
  async findByName(name) {
    const pool = await this.mssqlClient.getConnection();

    const result = await pool.request().input("name", sql.NVarChar, name)
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
      .input("nationalityId", sql.Int, nationalityId || null).query(`
        INSERT INTO Authors (name, nationality_id)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.nationality_id AS nationalityId
        VALUES (@name, @nationalityId)
      `);

    return result.recordset[0];
  }
}
