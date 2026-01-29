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

import sql from "mssql";
import { Book } from "../../models/Book.js";
import { BookQueryBuilder } from "./bookQueryBuilder.js";

export class BookRepository {
  constructor(mssqlClient) {
    this.mssqlClient = mssqlClient;
  }

  /**
   * Get all books with optional filters and pagination
   * @param {Object} filters - Optional filters { status, authorId }
   * @param {Object} pagination - Pagination params { page, limit }
   * @returns {Promise<{books: Book[], total: number, page: number, limit: number, totalPages: number}>}
   */
  async getAll(filters = {}, pagination = { page: 1, limit: 10 }) {
    const pool = await this.mssqlClient.getConnection();
    
    // Build query using Query Builder pattern
    const queryBuilder = new BookQueryBuilder();

    // Apply filters dynamically
    if (filters.status) {
      queryBuilder.withStatus(filters.status);
    }

    if (filters.authorId) {
      queryBuilder.withAuthorId(filters.authorId);
    }

    // Configure pagination
    queryBuilder.paginate(pagination.page, pagination.limit);

    // Build queries
    const selectQuery = queryBuilder.buildSelectQuery();
    const countQuery = queryBuilder.buildCountQuery();

    // Create requests and apply parameters
    const selectRequest = pool.request();
    const countRequest = pool.request();

    queryBuilder.applyParameters(selectRequest);
    queryBuilder.applyParameters(countRequest);

    // Execute queries in parallel
    const [dataResult, countResult] = await Promise.all([
      selectRequest.query(selectQuery),
      countRequest.query(countQuery)
    ]);
    
    const books = dataResult.recordset.map(record => Book.fromDatabase(record));
    const total = countResult.recordset[0].total;
    const { page, limit } = pagination;

    return {
      books,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get a single book by ID
   * @param {number} bookId - Book ID
   * @returns {Promise<Book|null>} Book entity or null if not found
   */
  async getById(bookId) {
    const pool = await this.mssqlClient.getConnection();
    
    const query = `
      SELECT 
        b.id,
        b.title,
        b.isbn,
        b.author_id,
        a.name as author_name,
        b.total_pages,
        bs.internal_code as status_code,
        b.current_reading_cycle,
        b.score,
        b.comment
      FROM Books b
      INNER JOIN Authors a ON b.author_id = a.id
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      WHERE b.id = @bookId
    `;

    const result = await pool
      .request()
      .input("bookId", sql.Int, bookId)
      .query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    return Book.fromDatabase(result.recordset[0]);
  }

  /**
   * Get book by ID with transaction support
   * @param {number} bookId - Book ID
   * @param {sql.Transaction} transaction - Active transaction
   * @returns {Promise<Book|null>} Book entity or null if not found
   */
  async getByIdWithTransaction(bookId, transaction) {
    const query = `
      SELECT 
        b.id,
        b.title,
        b.isbn,
        b.author_id,
        a.name as author_name,
        b.total_pages,
        bs.internal_code as status_code,
        b.current_reading_cycle,
        b.score,
        b.comment
      FROM Books b
      INNER JOIN Authors a ON b.author_id = a.id
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      WHERE b.id = @bookId
    `;

    const result = await transaction
      .request()
      .input("bookId", sql.Int, bookId)
      .query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    return Book.fromDatabase(result.recordset[0]);
  }

  /**
   * Update book status and cycle within a transaction
   * @param {number} bookId - Book ID
   * @param {string} newStatus - New status code
   * @param {number} currentCycle - Current reading cycle
   * @param {sql.Transaction} transaction - Active transaction
   * @returns {Promise<void>}
   */
  async updateStatus(bookId, newStatus, currentCycle, transaction) {
    const query = `
      UPDATE Books
      SET status_id = (SELECT id FROM BookStatuses WHERE internal_code = @newStatus),
          current_reading_cycle = @cycle
      WHERE id = @bookId
    `;

    await transaction
      .request()
      .input("bookId", sql.Int, bookId)
      .input("newStatus", sql.NVarChar, newStatus)
      .input("cycle", sql.Int, currentCycle)
      .query(query);
  }
}
