/**
 * UpdateBookService (Command Use Case)
 * Updates book metadata (title, pages, enriched metadata, score, comment) without changing status
 *
 * Responsibilities:
 * - Update book metadata fields
 * - Does not modify status (use dedicated endpoints for status transitions)
 *
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - Transactional
 * - Returns updated Book entity
 */

import sql from "mssql";
import { NotFoundError } from "../errors/index.js";

export class UpdateBookService {
  constructor(mssqlClient, bookRepository) {
    this.mssqlClient = mssqlClient;
    this.bookRepository = bookRepository;
  }

  /**
   * Execute UpdateBook use case
   * @param {number} bookId - Book ID to update
   * @param {Object} data - Partial update data { title?, totalPages?, publicationYear?, bookType?, genres?, synopsis?, score?, comment? }
   * @returns {Promise<Book>} Updated book entity
   */
  async execute(bookId, data) {
    // Step 1: Verify book exists
    const existingBook = await this.bookRepository.getById(bookId);

    if (!existingBook) {
      throw new NotFoundError("Book", bookId);
    }

    // Step 2: Update metadata within transaction
    const pool = await this.mssqlClient.getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const updatedBook = await this.bookRepository.updateMetadata(
        bookId,
        data,
        transaction,
      );

      await transaction.commit();

      return updatedBook;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
