/**
 * UpdateBookService (Command Use Case)
 * Updates book metadata (title, totalPages, score, comment) without changing status
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

import { NotFoundError } from "../errors/index.js";

export class UpdateBookService {
  constructor(pgClient, bookRepository) {
    this.pgClient = pgClient;
    this.bookRepository = bookRepository;
  }

  /**
   * Execute UpdateBook use case
   * @param {number} bookId - Book ID to update
   * @param {Object} data - Partial update data { title?, totalPages?, score?, comment? }
   * @returns {Promise<Book>} Updated book entity
   */
  async execute(bookId, data) {
    // Step 1: Verify book exists
    const existingBook = await this.bookRepository.getById(bookId);

    if (!existingBook) {
      throw new NotFoundError("Book", bookId);
    }

    // Step 2: Update metadata within transaction
    const client = await this.pgClient.beginTransaction();

    try {
      const updatedBook = await this.bookRepository.updateMetadata(
        bookId,
        data,
        client,
      );

      await client.query("COMMIT");

      return updatedBook;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
