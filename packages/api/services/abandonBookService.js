/**
 * AbandonBookService (Command Use Case)
 * Marks a book as abandoned with required score
 * 
 * Responsibilities:
 * - Implement AbandonBook use case as defined in USE_CASES.md
 * - Orchestrate repositories within a transaction
 * - Delegate domain decisions to Book entity
 * 
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - No domain logic (delegated to Book entity)
 * - Transactional (mutates: Books, BookStatusHistory)
 * - Returns updated Book entity
 */

import sql from "mssql";
import { NotFoundError } from "../errors/index.js";
import { BookStatus } from "../models/BookStatus.js";

export class AbandonBookService {
  constructor(
    mssqlClient,
    bookRepository,
    bookStatusHistoryRepository
  ) {
    this.mssqlClient = mssqlClient;
    this.bookRepository = bookRepository;
    this.bookStatusHistoryRepository = bookStatusHistoryRepository;
  }

  /**
   * Execute AbandonBook use case
   * @param {Object} input - { bookId, score, comment?, abandonmentDate? }
   * @returns {Promise<Book>}
   */
  async execute(input) {
    const { bookId, score, comment } = input;

    // Step 1: Load book (outside transaction)
    const book = await this.bookRepository.getById(bookId);

    if (!book) {
      throw new NotFoundError("Book", bookId);
    }

    // Step 2: Validate transition - Delegate to Book entity
    // Throws: InvalidStateTransitionError, MissingScoreError
    book.ensureCanBeAbandoned(score);

    // Step 3: Begin transaction for writes
    const pool = await this.mssqlClient.getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 3.1 Update Book to ABANDONED with score and comment
      await this.bookRepository.updateToClosedStatus(
        bookId,
        BookStatus.ABANDONED,
        score,
        comment,
        transaction
      );

      // 3.2 Insert BookStatusHistory
      await this.bookStatusHistoryRepository.create(
        {
          bookId,
          oldStatus: book.status,
          newStatus: BookStatus.ABANDONED,
          readingCycle: book.currentReadingCycle
        },
        transaction
      );

      await transaction.commit();

      // Step 4: Reload book to get updated state
      const updatedBook = await this.bookRepository.getById(bookId);
      return updatedBook;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
