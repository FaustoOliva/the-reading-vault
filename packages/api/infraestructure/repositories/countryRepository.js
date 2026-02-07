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
   * Find country by name (case-insensitive)
   * @param {string} name - Country name
   * @returns {Promise<{id: number, name: string} | null>}
   */
  async findByName(name) {
    const pool = await this.mssqlClient.getConnection();
    
    const result = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .query(`
        SELECT id, name
        FROM Countries
        WHERE LOWER(name) = LOWER(@name)
      `);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  /**
   * Create a new country
   * @param {Object} data - { name }
   * @param {sql.Transaction} transaction - Required transaction
   * @returns {Promise<{id: number, name: string}>}
   */
  async create(data, transaction) {
    const { name } = data;
    
    const request = new sql.Request(transaction);
    
    const result = await request
      .input("name", sql.NVarChar, name)
      .query(`
        INSERT INTO Countries (name)
        OUTPUT INSERTED.id, INSERTED.name
        VALUES (@name)
      `);

    return result.recordset[0];
  }
}
