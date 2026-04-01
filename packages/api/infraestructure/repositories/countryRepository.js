/**
 * CountryRepository
 * Handles data persistence operations for Country entity
 *
 * Responsibilities:
 * - Query countries from database
 * - Create new countries
 *
 * Rules:
 * - No business logic
 * - No HTTP concerns
 * - Receives DB session/transaction explicitly when needed
 */

import sql from "mssql";

export class CountryRepository {
  constructor(mssqlClient) {
    this.mssqlClient = mssqlClient;
  }

  /**
   * Get all countries with optional name filtering, sorted alphabetically
   * @param {Object} filters - Optional filters { nameLike }
   * @returns {Promise<Array<{id: number, name: string, isoCode: string}>>}
   */
  async getAll(filters = {}) {
    const pool = await this.mssqlClient.getConnection();
    const request = pool.request();

    let whereClause = "";

    if (filters.nameLike) {
      whereClause = "WHERE name LIKE @nameLike";
      request.input("nameLike", sql.NVarChar, `%${filters.nameLike}%`);
    }

    const result = await request.query(`
      SELECT 
        id,
        name,
        iso_code as isoCode
      FROM Countries
      ${whereClause}
      ORDER BY name ASC
    `);

    return result.recordset;
  }

  /**
   * Find country by name (case-insensitive)
   * @param {string} name - Country name
   * @returns {Promise<{id: number, name: string, isoCode: string} | null>}
   */
  async findByName(name) {
    const pool = await this.mssqlClient.getConnection();

    const result = await pool.request().input("name", sql.NVarChar, name)
      .query(`
        SELECT id, name, iso_code as isoCode
        FROM Countries
        WHERE LOWER(name) = LOWER(@name)
      `);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  /**
   * Create a new country
   * @param {Object} data - { name, isoCode }
   * @param {sql.Transaction} transaction - Required transaction
   * @returns {Promise<{id: number, name: string, isoCode: string}>}
   */
  async create(data, transaction) {
    const { name, isoCode } = data;

    const request = new sql.Request(transaction);

    const result = await request
      .input("name", sql.NVarChar, name)
      .input("isoCode", sql.NVarChar, isoCode).query(`
        INSERT INTO Countries (name, iso_code)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.iso_code as isoCode
        VALUES (@name, @isoCode)
      `);

    return result.recordset[0];
  }
}
