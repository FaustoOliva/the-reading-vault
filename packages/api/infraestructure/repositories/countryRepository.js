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

export class CountryRepository {
  constructor(pgClient) {
    this.pgClient = pgClient;
  }

  /**
   * Get all countries with optional name filtering, sorted alphabetically
   * @param {Object} filters - Optional filters { nameLike }
   * @returns {Promise<Array<{id: number, name: string}>>}
   */
  async getAll(filters = {}) {
    const pool = this.pgClient.getConnection();

    let query = `
      SELECT 
        id,
        name
      FROM countries
    `;

    const params = [];
    if (filters.nameLike) {
      query += ` WHERE name ILIKE $1`;
      params.push(`%${filters.nameLike}%`);
    }

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Find country by name (case-insensitive)
   * @param {string} name - Country name
   * @returns {Promise<{id: number, name: string} | null>}
   */
  async findByName(name) {
    const pool = this.pgClient.getConnection();

    const result = await pool.query(
      `
        SELECT id, name
        FROM countries
        WHERE LOWER(name) = LOWER($1)
      `,
      [name]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Create a new country
   * @param {Object} data - { name }
   * @param {PoolClient} transaction - Required transaction
   * @returns {Promise<{id: number, name: string}>}
   */
  async create(data, transaction) {
    const { name } = data;

    const result = await transaction.query(
      `
        INSERT INTO countries (name)
        VALUES ($1)
        RETURNING id, name
      `,
      [name]
    );

    return result.rows[0];
  }
}
