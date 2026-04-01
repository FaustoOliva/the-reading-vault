/**
 * GenresRepository
 * Handles data persistence operations for Genres
 *
 * Responsibilities:
 * - Query genres from database
 * - Return existing genres sorted alphabetically
 *
 * Rules:
 * - No business logic
 * - No HTTP concerns
 * - Read-only operations
 */

export class GenresRepository {
  constructor(mssqlClient) {
    this.mssqlClient = mssqlClient;
  }

  /**
   * Get all genres sorted by name
   * @returns {Promise<Array<{id: number, name: string}>>}
   */
  async getAll() {
    const pool = await this.mssqlClient.getConnection();

    const result = await pool
      .request()
      .query("SELECT id, name FROM Genres ORDER BY name ASC");

    return result.recordset.map((record) => ({
      id: record.id,
      name: record.name,
    }));
  }
}
