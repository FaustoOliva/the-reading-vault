/**
 * BookQueryBuilder
 * Builds SQL queries for book retrieval with dynamic filters
 * 
 * Responsibilities:
 * - Construct SELECT and COUNT queries dynamically
 * - Apply filters (status, author, etc.)
 * - Handle pagination (OFFSET/FETCH)
 * - Manage SQL parameters
 * 
 * Benefits:
 * - Open/Closed Principle: extend with new filters without modifying existing code
 * - Single Responsibility: only query construction
 * - Testable: can verify generated SQL
 */

import sql from "mssql";

export class BookQueryBuilder {
  constructor() {
    this.filters = [];
    this.params = new Map();
    this.paginationConfig = null;
  }

  /**
   * Filter by book status
   * @param {string} status - BookStatus enum value
   * @returns {BookQueryBuilder} this for chaining
   */
  withStatus(status) {
    this.filters.push({
      condition: ` AND bs.internal_code = @status`,
      param: { name: 'status', type: sql.NVarChar, value: status }
    });
    return this;
  }

  /**
   * Filter by author ID
   * @param {number} authorId - Author ID
   * @returns {BookQueryBuilder} this for chaining
   */
  withAuthorId(authorId) {
    this.filters.push({
      condition: ` AND b.author_id = @authorId`,
      param: { name: 'authorId', type: sql.Int, value: authorId }
    });
    return this;
  }

  /**
   * Configure pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @returns {BookQueryBuilder} this for chaining
   */
  paginate(page, limit) {
    this.paginationConfig = { page, limit };
    return this;
  }

  /**
   * Build the SELECT query for fetching books
   * @returns {string} SQL query
   */
  buildSelectQuery() {
    let query = `
      SELECT 
        b.id,
        b.title,
        b.isbn,
        b.author_id,
        a.name as author_name,
        c.name as author_nationality,
        b.total_pages,
        bs.internal_code as status_code,
        b.current_reading_cycle,
        b.score,
        b.comment
      FROM Books b
      INNER JOIN Authors a ON b.author_id = a.id
      LEFT JOIN Countries c ON a.nationality_id = c.id
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      WHERE 1=1
    `;

    // Apply all filters
    for (const filter of this.filters) {
      query += filter.condition;
    }

    // Add ordering
    query += ` ORDER BY b.id DESC`;

    // Add pagination if configured
    if (this.paginationConfig) {
      const { page, limit } = this.paginationConfig;
      const offset = (page - 1) * limit;
      query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
      
      this.params.set('offset', { type: sql.Int, value: offset });
      this.params.set('limit', { type: sql.Int, value: limit });
    }

    // Store filter parameters
    for (const filter of this.filters) {
      this.params.set(filter.param.name, {
        type: filter.param.type,
        value: filter.param.value
      });
    }

    return query;
  }

  /**
   * Build the COUNT query for pagination metadata
   * @returns {string} SQL query
   */
  buildCountQuery() {
    let query = `
      SELECT COUNT(*) as total
      FROM Books b
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      WHERE 1=1
    `;

    // Apply all filters (same as SELECT)
    for (const filter of this.filters) {
      query += filter.condition;
    }

    return query;
  }

  /**
   * Apply parameters to a SQL request
   * @param {import('mssql').Request} request - MSSQL request object
   * @returns {import('mssql').Request} request with parameters applied
   */
  applyParameters(request) {
    for (const [name, param] of this.params.entries()) {
      request.input(name, param.type, param.value);
    }
    return request;
  }

  /**
   * Get pagination configuration
   * @returns {{page: number, limit: number}|null}
   */
  getPaginationConfig() {
    return this.paginationConfig;
  }

  /**
   * Reset builder state for reuse
   * @returns {BookQueryBuilder} this for chaining
   */
  reset() {
    this.filters = [];
    this.params = new Map();
    this.paginationConfig = null;
    return this;
  }
}
