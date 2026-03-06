/**
 * BookRepository
 * Handles data persistence operations for Book entity
 *
 * Responsibilities:
 * - Query books from database
 * - Translate DB records into Book domain entities
 * - Delegate query construction to BookQueryBuilder
 *
 * Rules:
 * - No business logic
 * - No HTTP concerns
 * - Receives DB session/transaction explicitly when needed
 * - Uses Query Builder for OCP compliance
 */

import { Book } from "../../models/Book.js";
import { BookQueryBuilder } from "./bookQueryBuilder.js";

export class BookRepository {
  constructor(pgClient) {
    this.pgClient = pgClient;
  }

  /**
   * Get all books with optional filters and pagination
   * @param {Object} filters - Optional filters { status, authorId, countryId, titleSearch, minScore, maxScore, minPages, maxPages, startDate, endDate }
   * @param {Object} pagination - Pagination params { page, limit }
   * @returns {Promise<{books: Book[], total: number, page: number, limit: number, totalPages: number}>}
   */
  async getAll(filters = {}, pagination = { page: 1, limit: 10 }) {
    const pool = this.pgClient.getConnection();

    // Build query using Query Builder pattern
    const queryBuilder = new BookQueryBuilder();

    // Apply filters dynamically
    if (filters.status) {
      queryBuilder.withStatus(filters.status);
    }

    if (filters.authorId) {
      queryBuilder.withAuthorId(filters.authorId);
    }

    if (filters.countryId) {
      queryBuilder.withCountryId(filters.countryId);
    }

    if (filters.titleSearch) {
      queryBuilder.withTitleSearch(filters.titleSearch);
    }

    if (filters.minScore !== undefined || filters.maxScore !== undefined) {
      queryBuilder.withScoreRange(filters.minScore, filters.maxScore);
    }

    if (filters.minPages !== undefined || filters.maxPages !== undefined) {
      queryBuilder.withPageRange(filters.minPages, filters.maxPages);
    }

    if (filters.startDate || filters.endDate) {
      queryBuilder.withDateRange(filters.startDate, filters.endDate);
    }

    // Configure pagination
    queryBuilder.paginate(pagination.page, pagination.limit);

    // Build queries
    const selectQuery = queryBuilder.buildSelectQuery();
    const countQuery = queryBuilder.buildCountQuery();
    const selectParams = queryBuilder.getParameters();
    const countParams = queryBuilder.getCountParameters();

    // Execute queries in parallel
    const [dataResult, countResult] = await Promise.all([
      pool.query(selectQuery, selectParams),
      pool.query(countQuery, countParams),
    ]);

    const books = dataResult.rows.map((record) => Book.fromDatabase(record));
    const total = countResult.rows[0].total;
    const { page, limit } = pagination;

    return {
      books,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single book by ID
   * @param {number} bookId - Book ID
   * @returns {Promise<Book|null>} Book entity or null if not found
   */
  async getById(bookId) {
    const pool = this.pgClient.getConnection();

    const query = `
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
      WHERE b.id = $1
    `;

    const result = await pool.query(query, [bookId]);

    if (result.rows.length === 0) {
      return null;
    }

    return Book.fromDatabase(result.rows[0]);
  }

  /**
   * Update book status and cycle within a transaction
   * @param {number} bookId - Book ID
   * @param {string} newStatus - New status code
   * @param {number} currentCycle - Current reading cycle
   * @param {PoolClient} transaction - Active transaction
   * @returns {Promise<void>}
   */
  async updateStatus(bookId, newStatus, currentCycle, transaction) {
    const query = `
      UPDATE books
      SET status_id = (SELECT id FROM bookstatuses WHERE internal_code = $1),
          current_reading_cycle = $2
      WHERE id = $3
    `;

    await transaction.query(query, [newStatus, currentCycle, bookId]);
  }

  /**
   * Update book metadata (title, totalPages, score, comment) - does NOT change status
   * @param {number} bookId - Book ID
   * @param {Object} data - Partial update data { title?, totalPages?, score?, comment? }
   * @param {PoolClient} transaction - Active transaction
   * @returns {Promise<Book>} Updated book entity
   */
  async updateMetadata(bookId, data, transaction) {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }

    if (data.totalPages !== undefined) {
      updates.push(`total_pages = $${paramIndex++}`);
      params.push(data.totalPages);
    }

    if (data.score !== undefined) {
      updates.push(`score = $${paramIndex++}`);
      params.push(data.score);
    }

    if (data.comment !== undefined) {
      updates.push(`comment = $${paramIndex++}`);
      params.push(data.comment || null);
    }

    // Always fetch and return the updated book within the same transaction
    if (updates.length > 0) {
      const query = `
        UPDATE books
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex}
      `;

      params.push(bookId);
      await transaction.query(query, params);
    }

    // Fetch updated book within the same transaction
    const selectQuery = `
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
      WHERE b.id = $1
    `;

    const result = await transaction.query(selectQuery, [bookId]);

    return Book.fromDatabase(result.rows[0]);
  }

  /**
   * Review book - transition from PENDING_SCORE to COMPLETED/ABANDONED with score
   * @param {number} bookId - Book ID
   * @param {string} targetStatus - Target status code (COMPLETED or ABANDONED)
   * @param {number} score - Book score (0.0-10.0)
   * @param {string|null} comment - Optional comment
   * @param {PoolClient} transaction - Active transaction
   * @returns {Promise<void>}
   */
  async updateReview(bookId, targetStatus, score, comment, transaction) {
    const query = `
      UPDATE books
      SET status_id = (SELECT id FROM bookstatuses WHERE internal_code = $1),
          score = $2,
          comment = $3
      WHERE id = $4
    `;

    await transaction.query(query, [
      targetStatus,
      score,
      comment || null,
      bookId,
    ]);
  }

  /**
   * Find book by ISBN
   * @param {string} isbn - Book ISBN
   * @returns {Promise<Book|null>} Book entity or null if not found
   */
  async findByIsbn(isbn) {
    const pool = this.pgClient.getConnection();

    const query = `
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
      WHERE b.isbn = $1
    `;

    const result = await pool.query(query, [isbn]);

    if (result.rows.length === 0) {
      return null;
    }

    return Book.fromDatabase(result.rows[0]);
  }

  /**
   * Create a new book
   * @param {Object} data - { title, isbn, authorId, totalPages, statusId }
   * @param {PoolClient} transaction - Required transaction
   * @returns {Promise<Book>} Created book entity
   */
  async create(data, transaction) {
    const { title, isbn, authorId, totalPages, statusId } = data;

    const query = `
      INSERT INTO books (title, isbn, author_id, total_pages, status_id, current_reading_cycle)
      VALUES ($1, $2, $3, $4, $5, 1)
      RETURNING id, title, isbn, author_id, total_pages, current_reading_cycle, score, comment
    `;

    const result = await transaction.query(query, [
      title,
      isbn || null,
      authorId,
      totalPages || null,
      statusId,
    ]);

    const insertedRecord = result.rows[0];

    // Get author name and status code for complete Book entity
    const fullBookQuery = `
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
      WHERE b.id = $1
    `;

    const fullResult = await transaction.query(fullBookQuery, [
      insertedRecord.id,
    ]);

    return Book.fromDatabase(fullResult.rows[0]);
  }

  /**
   * Calculate global KPIs for all books
   * No transaction needed (read-only)
   * @returns {Promise<Object>} Global book statistics
   */
  async calculateGlobalKPIs() {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN bs.internal_code = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN bs.internal_code = 'ABANDONED' THEN 1 ELSE 0 END) as abandoned,
        SUM(CASE WHEN bs.internal_code = 'READING' THEN 1 ELSE 0 END) as reading,
        SUM(CASE WHEN bs.internal_code = 'PENDING_SCORE' THEN 1 ELSE 0 END) as "pendingScore",
        SUM(CASE WHEN bs.internal_code = 'WISH_LIST' THEN 1 ELSE 0 END) as "wishList",
        AVG(CASE WHEN b.score IS NOT NULL THEN b.score ELSE NULL END) as "avgScore",
        COUNT(CASE WHEN b.score IS NOT NULL THEN 1 END) as "booksRated"
      FROM books b
      INNER JOIN bookstatuses bs ON b.status_id = bs.id
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  /**
   * Get average days to completion per book
   * Calculated from first session to completion date via BookStatusHistory
   * @returns {Promise<number|null>} Average days or null if no completed books
   */
  async getAverageDaysToComplete() {
    const pool = this.pgClient.getConnection();

    const query = `
      SELECT 
        AVG(EXTRACT(DAY FROM (last_session - first_session))) as average_days
      FROM (
        SELECT 
          b.id,
          MIN(rs.occurred_at) as first_session,
          MAX(rs.occurred_at) as last_session
        FROM books b
        INNER JOIN bookstatuses bs ON b.status_id = bs.id
        INNER JOIN readingsessions rs ON rs.book_id = b.id
        WHERE bs.internal_code = 'COMPLETED'
        GROUP BY b.id
        HAVING MIN(rs.occurred_at) <= MAX(rs.occurred_at)
      ) as completed_books
    `;

    const result = await pool.query(query);
    return result.rows[0].average_days || null;
  }
}
