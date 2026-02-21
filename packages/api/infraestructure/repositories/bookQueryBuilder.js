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
      param: { name: "status", type: sql.NVarChar, value: status },
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
      param: { name: "authorId", type: sql.Int, value: authorId },
    });
    return this;
  }

  /**
   * Filter by country (author's nationality)
   * @param {number} countryId - Country ID
   * @returns {BookQueryBuilder} this for chaining
   */
  withCountryId(countryId) {
    if (!countryId) return this;

    this.filters.push({
      condition: ` AND c.id = @countryId`,
      param: { name: "countryId", type: sql.Int, value: countryId },
    });
    return this;
  }

  /**
   * Search books by title (partial match, case-insensitive)
   * @param {string} keyword - Search keyword
   * @returns {BookQueryBuilder} this for chaining
   */
  withTitleSearch(keyword) {
    if (!keyword || keyword.trim() === "") return this;

    this.filters.push({
      condition: ` AND b.title LIKE @titleSearch`,
      param: {
        name: "titleSearch",
        type: sql.NVarChar,
        value: `%${keyword.trim()}%`,
      },
    });
    return this;
  }

  /**
   * Filter by score range (rating)
   * @param {number|null} minScore - Minimum score (inclusive)
   * @param {number|null} maxScore - Maximum score (inclusive)
   * @returns {BookQueryBuilder} this for chaining
   */
  withScoreRange(minScore, maxScore) {
    if (minScore !== null && minScore !== undefined) {
      this.filters.push({
        condition: ` AND b.score >= @minScore`,
        param: { name: "minScore", type: sql.Decimal(3, 1), value: minScore },
      });
    }

    if (maxScore !== null && maxScore !== undefined) {
      this.filters.push({
        condition: ` AND b.score <= @maxScore`,
        param: { name: "maxScore", type: sql.Decimal(3, 1), value: maxScore },
      });
    }

    return this;
  }

  /**
   * Filter by page count range
   * @param {number|null} minPages - Minimum pages (inclusive)
   * @param {number|null} maxPages - Maximum pages (inclusive)
   * @returns {BookQueryBuilder} this for chaining
   */
  withPageRange(minPages, maxPages) {
    if (minPages !== null && minPages !== undefined) {
      this.filters.push({
        condition: ` AND b.total_pages >= @minPages`,
        param: { name: "minPages", type: sql.Int, value: minPages },
      });
    }

    if (maxPages !== null && maxPages !== undefined) {
      this.filters.push({
        condition: ` AND b.total_pages <= @maxPages`,
        param: { name: "maxPages", type: sql.Int, value: maxPages },
      });
    }

    return this;
  }

  /**
   * Filter by date range based on first status transition (creation proxy)
   * Note: Uses BookStatusHistory as proxy for book creation date since Books table lacks created_at
   * @param {Date|string|null} startDate - Start date (inclusive)
   * @param {Date|string|null} endDate - End date (inclusive)
   * @returns {BookQueryBuilder} this for chaining
   */
  withDateRange(startDate, endDate) {
    if (startDate) {
      this.filters.push({
        condition: ` AND EXISTS (
          SELECT 1 FROM BookStatusHistory bsh
          WHERE bsh.book_id = b.id
          AND bsh.created_at >= @startDate
        )`,
        param: {
          name: "startDate",
          type: sql.DateTime,
          value: new Date(startDate),
        },
      });
    }

    if (endDate) {
      this.filters.push({
        condition: ` AND EXISTS (
          SELECT 1 FROM BookStatusHistory bsh
          WHERE bsh.book_id = b.id
          AND bsh.created_at <= @endDate
        )`,
        param: {
          name: "endDate",
          type: sql.DateTime,
          value: new Date(endDate),
        },
      });
    }

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

      this.params.set("offset", { type: sql.Int, value: offset });
      this.params.set("limit", { type: sql.Int, value: limit });
    }

    // Store filter parameters
    for (const filter of this.filters) {
      this.params.set(filter.param.name, {
        type: filter.param.type,
        value: filter.param.value,
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
      INNER JOIN Authors a ON b.author_id = a.id
      LEFT JOIN Countries c ON a.nationality_id = c.id
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
