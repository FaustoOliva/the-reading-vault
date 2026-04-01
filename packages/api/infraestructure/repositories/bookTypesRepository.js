/**
 * BookTypesRepository
 * Handles data persistence operations for BookTypes
 *
 * Responsibilities:
 * - Query book types from database
 * - Return predefined book types
 *
 * Rules:
 * - No business logic
 * - No HTTP concerns
 * - Read-only operations
 */

export class BookTypesRepository {
  constructor(mssqlClient) {
    this.mssqlClient = mssqlClient;
  }

  /**
   * Get all book types sorted by name
   * @returns {Promise<Array<{id: number, name: string}>>}
   */
  async getAll() {
    const pool = await this.mssqlClient.getConnection();

    const result = await pool
      .request()
      .query("SELECT id, name FROM BookTypes ORDER BY name ASC");

    return result.recordset.map((record) => ({
      id: record.id,
      name: record.name,
    }));
  }
}
