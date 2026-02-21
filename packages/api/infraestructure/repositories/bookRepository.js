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

  /**
   * Update book metadata (title, totalPages, score, comment) - does NOT change status
   * @param {number} bookId - Book ID
   * @param {Object} data - Partial update data { title?, totalPages?, score?, comment? }
   * @param {sql.Transaction} transaction - Active transaction
   * @returns {Promise<Book>} Updated book entity
   */
  async updateMetadata(bookId, data, transaction) {
    const updates = [];
    const request = new sql.Request(transaction);

    if (data.title !== undefined) {
      updates.push("title = @title");
      request.input("title", sql.NVarChar, data.title);
    }

    if (data.totalPages !== undefined) {
      updates.push("total_pages = @totalPages");
      request.input("totalPages", sql.Int, data.totalPages);
    }

    if (data.score !== undefined) {
      updates.push("score = @score");
      request.input("score", sql.Decimal(3, 1), data.score);
    }

    if (data.comment !== undefined) {
      updates.push("comment = @comment");
      request.input("comment", sql.NVarChar, data.comment || null);
    }

    // Always fetch and return the updated book within the same transaction
    if (updates.length > 0) {
      const query = `
        UPDATE Books
        SET ${updates.join(", ")}
        WHERE id = @bookId
      `;

      await request
        .input("bookId", sql.Int, bookId)
        .query(query);
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
      FROM Books b
      INNER JOIN Authors a ON b.author_id = a.id
      LEFT JOIN Countries c ON a.nationality_id = c.id
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      WHERE b.id = @bookIdSelect
    `;

    const selectRequest = new sql.Request(transaction);
    const result = await selectRequest
      .input("bookIdSelect", sql.Int, bookId)
      .query(selectQuery);

    return Book.fromDatabase(result.recordset[0]);
  }

  /**
   * Review book - transition from PENDING_SCORE to COMPLETED/ABANDONED with score
   * @param {number} bookId - Book ID
   * @param {string} targetStatus - Target status code (COMPLETED or ABANDONED)
   * @param {number} score - Book score (0.0-10.0)
   * @param {string|null} comment - Optional comment
   * @param {sql.Transaction} transaction - Active transaction
   * @returns {Promise<void>}
   */
  async updateReview(bookId, targetStatus, score, comment, transaction) {
    const query = `
      UPDATE Books
      SET status_id = (SELECT id FROM BookStatuses WHERE internal_code = @targetStatus),
          score = @score,
          comment = @comment
      WHERE id = @bookId
    `;

    await transaction
      .request()
      .input("bookId", sql.Int, bookId)
      .input("targetStatus", sql.NVarChar, targetStatus)
      .input("score", sql.Decimal(3, 1), score)
      .input("comment", sql.NVarChar, comment || null)
      .query(query);
  }

  /**
   * Find book by ISBN
   * @param {string} isbn - Book ISBN
   * @returns {Promise<Book|null>} Book entity or null if not found
   */
  async findByIsbn(isbn) {
    const pool = await this.mssqlClient.getConnection();
    
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
      FROM Books b
      INNER JOIN Authors a ON b.author_id = a.id
      LEFT JOIN Countries c ON a.nationality_id = c.id
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      WHERE b.isbn = @isbn
    `;

    const result = await pool
      .request()
      .input("isbn", sql.NVarChar, isbn)
      .query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    return Book.fromDatabase(result.recordset[0]);
  }

  /**
   * Create a new book
   * @param {Object} data - { title, isbn, authorId, totalPages, statusId }
   * @param {sql.Transaction} transaction - Required transaction
   * @returns {Promise<Book>} Created book entity
   */
  async create(data, transaction) {
    const { title, isbn, authorId, totalPages, statusId } = data;
    
    const request = new sql.Request(transaction);
    
    const query = `
      INSERT INTO Books (title, isbn, author_id, total_pages, status_id, current_reading_cycle)
      OUTPUT INSERTED.id, INSERTED.title, INSERTED.isbn, INSERTED.author_id, 
             INSERTED.total_pages, INSERTED.current_reading_cycle, 
             INSERTED.score, INSERTED.comment
      VALUES (@title, @isbn, @authorId, @totalPages, @statusId, 1)
    `;

    const result = await request
      .input("title", sql.NVarChar, title)
      .input("isbn", sql.NVarChar, isbn || null)
      .input("authorId", sql.Int, authorId)
      .input("totalPages", sql.Int, totalPages || null)
      .input("statusId", sql.Int, statusId)
      .query(query);

    const insertedRecord = result.recordset[0];

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
      FROM Books b
      INNER JOIN Authors a ON b.author_id = a.id
      LEFT JOIN Countries c ON a.nationality_id = c.id
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      WHERE b.id = @bookId
    `;

    const fullResult = await request
      .input("bookId", sql.Int, insertedRecord.id)
      .query(fullBookQuery);

    return Book.fromDatabase(fullResult.recordset[0]);
  }

  /**
   * Calculate global KPIs for all books
   * No transaction needed (read-only)
   * @returns {Promise<Object>} Global book statistics
   */
  async calculateGlobalKPIs() {
    const pool = await this.mssqlClient.getConnection();
    
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN bs.internal_code = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN bs.internal_code = 'ABANDONED' THEN 1 ELSE 0 END) as abandoned,
        SUM(CASE WHEN bs.internal_code = 'READING' THEN 1 ELSE 0 END) as reading,
        SUM(CASE WHEN bs.internal_code = 'PENDING_SCORE' THEN 1 ELSE 0 END) as pendingScore,
        SUM(CASE WHEN bs.internal_code = 'WISH_LIST' THEN 1 ELSE 0 END) as wishList,
        AVG(CASE WHEN b.score IS NOT NULL THEN b.score ELSE NULL END) as avgScore,
        COUNT(CASE WHEN b.score IS NOT NULL THEN 1 END) as booksRated
      FROM Books b
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
    `;
    
    const result = await pool.request().query(query);
    return result.recordset[0];
  }

  /**
   * Get average days to completion per book
   * Calculated from first session to completion date via BookStatusHistory
   * @returns {Promise<number|null>} Average days or null if no completed books
   */
  async getAverageDaysToComplete() {
    const pool = await this.mssqlClient.getConnection();
  
    const query = `
      SELECT 
        AVG(DATEDIFF(DAY, first_session, last_session)) as average_days
      FROM (
        SELECT 
          b.id,
          MIN(rs.occurred_at) as first_session,
          MAX(rs.occurred_at) as last_session
        FROM Books b
        INNER JOIN BookStatuses bs ON b.status_id = bs.id
        INNER JOIN ReadingSessions rs ON rs.book_id = b.id
        WHERE bs.internal_code = 'COMPLETED'
        GROUP BY b.id
        HAVING MIN(rs.occurred_at) <= MAX(rs.occurred_at)
      ) as completed_books
    `;
    
    const result = await pool.request().query(query);
    return result.recordset[0].average_days || null;
  }
}
