/**
 * BookQueryBuilder
 * Builds SQL queries for book retrieval with dynamic filters
 *
 * Responsibilities:
 * - Construct SELECT and COUNT queries dynamically
 * - Apply filters (status, author, etc.)
 * - Handle pagination (OFFSET/LIMIT)
 * - Manage SQL parameters
 *
 * Benefits:
 * - Open/Closed Principle: extend with new filters without modifying existing code
 * - Single Responsibility: only query construction
 * - Testable: can verify generated SQL
 */

export class BookQueryBuilder {
  constructor() {
    this.filters = [];
    this.params = [];
    this.paginationConfig = null;
  }

  /**
   * Filter by book status
   * @param {string} status - BookStatus enum value
   * @returns {BookQueryBuilder} this for chaining
   */
  withStatus(status) {
    this.filters.push({
      condition: ` AND bs.internal_code = $${this.params.length + 1}`,
      value: status,
    });
    this.params.push(status);
    return this;
  }

  /**
   * Filter by author ID
   * @param {number} authorId - Author ID
   * @returns {BookQueryBuilder} this for chaining
   */
  withAuthorId(authorId) {
    this.filters.push({
      condition: ` AND b.author_id = $${this.params.length + 1}`,
      value: authorId,
    });
    this.params.push(authorId);
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
      condition: ` AND c.id = $${this.params.length + 1}`,
      value: countryId,
    });
    this.params.push(countryId);
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
      condition: ` AND b.title ILIKE $${this.params.length + 1}`,
      value: `%${keyword.trim()}%`,
    });
    this.params.push(`%${keyword.trim()}%`);
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
        condition: ` AND b.score >= $${this.params.length + 1}`,
        value: minScore,
      });
      this.params.push(minScore);
    }

    if (maxScore !== null && maxScore !== undefined) {
      this.filters.push({
        condition: ` AND b.score <= $${this.params.length + 1}`,
        value: maxScore,
      });
      this.params.push(maxScore);
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
        condition: ` AND b.total_pages >= $${this.params.length + 1}`,
        value: minPages,
      });
      this.params.push(minPages);
    }

    if (maxPages !== null && maxPages !== undefined) {
      this.filters.push({
        condition: ` AND b.total_pages <= $${this.params.length + 1}`,
        value: maxPages,
      });
      this.params.push(maxPages);
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
          SELECT 1 FROM bookstatushistory bsh
          WHERE bsh.book_id = b.id
          AND bsh.created_at >= $${this.params.length + 1}
        )`,
        value: new Date(startDate),
      });
      this.params.push(new Date(startDate));
    }

    if (endDate) {
      this.filters.push({
        condition: ` AND EXISTS (
          SELECT 1 FROM bookstatushistory bsh
          WHERE bsh.book_id = b.id
          AND bsh.created_at <= $${this.params.length + 1}
        )`,
        value: new Date(endDate),
      });
      this.params.push(new Date(endDate));
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
      FROM books b
      INNER JOIN authors a ON b.author_id = a.id
      LEFT JOIN countries c ON a.nationality_id = c.id
      INNER JOIN bookstatuses bs ON b.status_id = bs.id
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
      query += ` OFFSET $${this.params.length + 1} LIMIT $${this.params.length + 2}`;
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
      FROM books b
      INNER JOIN authors a ON b.author_id = a.id
      LEFT JOIN countries c ON a.nationality_id = c.id
      INNER JOIN bookstatuses bs ON b.status_id = bs.id
      WHERE 1=1
    `;

    // Apply all filters (same as SELECT)
    for (const filter of this.filters) {
      query += filter.condition;
    }

    return query;
  }

  /**
   * Get parameters array (for SELECT query with pagination)
   * @returns {Array} Parameters in order
   */
  getParameters() {
    const params = [...this.params];

    if (this.paginationConfig) {
      const { page, limit } = this.paginationConfig;
      const offset = (page - 1) * limit;
      params.push(offset, limit);
    }

    return params;
  }

  /**
   * Get parameters array for COUNT query (without pagination)
   * @returns {Array} Parameters in order
   */
  getCountParameters() {
    return [...this.params];
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
    this.params = [];
    this.paginationConfig = null;
    return this;
  }
}
