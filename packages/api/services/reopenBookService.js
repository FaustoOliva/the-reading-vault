/**
 * ReopenBookService (Command Use Case)
 * Reopens an ABANDONED book, transitioning it back to READING status
 *
 * Responsibilities:
 * - Validate book is ABANDONED
 * - Transition to READING and increment cycle
 * - Insert status history
 *
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - Domain validation delegated to Book entity
 * - Transactional (mutates: Books, BookStatusHistory)
 * - Returns updated Book entity
 */

import sql from "mssql";
import { NotFoundError } from "../errors/index.js";

export class ReopenBookService {
  constructor(
    mssqlClient,
    bookRepository,
    bookStatusHistoryRepository,
    getReaderProfileService,
  ) {
    this.mssqlClient = mssqlClient;
    this.bookRepository = bookRepository;
    this.bookStatusHistoryRepository = bookStatusHistoryRepository;
    this.getReaderProfileService = getReaderProfileService;
  }

  /**
   * Execute ReopenBook use case
   * @param {number} bookId - Book ID to reopen
   * @returns {Promise<Book>} Updated book entity
   */
  async execute(bookId) {
    // Step 1: Load book
    const book = await this.bookRepository.getById(bookId);

    if (!book) {
      throw new NotFoundError("Book", bookId);
    }

    // Step 2: Domain validation - Delegate to Book entity
    book.ensureCanBeReopened();

    // Step 3: Reopen book within transaction
    const pool = await this.mssqlClient.getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const newCycle = book.currentReadingCycle + 1;

      // 3.1 Update book status and increment cycle
      await this.bookRepository.updateStatus(
        bookId,
        "READING",
        newCycle,
        transaction,
      );

      // 3.2 Insert BookStatusHistory
      await this.bookStatusHistoryRepository.create(
        {
          bookId,
          oldStatus: book.status,
          newStatus: "READING",
          readingCycle: newCycle,
        },
        transaction,
      );

      await transaction.commit();

      // Step 4: Return updated book
      const updatedBook = await this.bookRepository.getById(bookId);

      return updatedBook;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
