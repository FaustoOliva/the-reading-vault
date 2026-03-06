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

export class AuthorRepository {
  constructor(pgClient) {
    this.pgClient = pgClient;
  }

  /**
   * Get all authors with optional name filtering, sorted alphabetically
   * @param {Object} filters - Optional filters { nameLike }
   * @returns {Promise<Array<{id: number, name: string, nationality: string | null}>>}
   */
  async getAll(filters = {}) {
    const pool = this.pgClient.getConnection();
    
    let query = `
      SELECT 
        a.id,
        a.name,
        c.name AS nationality
      FROM authors a
      LEFT JOIN countries c ON a.nationality_id = c.id
    `;

    const params = [];
    if (filters.nameLike) {
      query += ` WHERE a.name ILIKE $1`;
      params.push(`%${filters.nameLike}%`);
    }

    query += ` ORDER BY a.name ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Find author by name (case-insensitive)
   * @param {string} name - Author name
   * @returns {Promise<{id: number, name: string, nationalityId: number | null} | null>}
   */
  async findByName(name) {
    const pool = this.pgClient.getConnection();

    const result = await pool.query(
      `
        SELECT id, name, nationality_id AS "nationalityId"
        FROM authors
        WHERE LOWER(name) = LOWER($1)
      `,
      [name]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Create a new author
   * @param {Object} data - { name, nationalityId }
   * @param {PoolClient} transaction - Required transaction
   * @returns {Promise<{id: number, name: string, nationalityId: number | null}>}
   */
  async create(data, transaction) {
    const { name, nationalityId } = data;

    const result = await transaction.query(
      `
        INSERT INTO authors (name, nationality_id)
        VALUES ($1, $2)
        RETURNING id, name, nationality_id AS "nationalityId"
      `,
      [name, nationalityId || null]
    );

    return result.rows[0];
  }
}
