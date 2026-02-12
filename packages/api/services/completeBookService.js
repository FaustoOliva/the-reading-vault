/**
 * CompleteBookService (Command Use Case)
 * Marks a book as completed with required score
 * 
 * Responsibilities:
 * - Implement CompleteBook use case as defined in USE_CASES.md
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

export class CompleteBookService {
  constructor(
    mssqlClient,
    bookRepository,
    readingSessionRepository,
    bookStatusHistoryRepository
  ) {
    this.mssqlClient = mssqlClient;
    this.bookRepository = bookRepository;
    this.readingSessionRepository = readingSessionRepository;
    this.bookStatusHistoryRepository = bookStatusHistoryRepository;
  }

  /**
   * Execute CompleteBook use case
   * @param {Object} input - { bookId, score, comment?, completionDate? }
   * @returns {Promise<Book>}
   */
  async execute(input) {
    const { bookId, score, comment } = input;

    // Step 1: Load book (outside transaction)
    const book = await this.bookRepository.getById(bookId);

    if (!book) {
      throw new NotFoundError("Book", bookId);
    }

    // Step 2: Get total pages read across all cycles
    const pagesReadTotal = await this.readingSessionRepository.getTotalPagesInCycle(
      bookId,
      book.currentReadingCycle
    );

    // Step 3: Validate transition - Delegate to Book entity
    // Throws: InvalidStateTransitionError, MissingScoreError, InsufficientPagesError
    book.ensureCanBeCompleted(score, pagesReadTotal);

    // Step 4: Begin transaction for writes
    const pool = await this.mssqlClient.getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 4.1 Update Book to COMPLETED with score and comment
      await this.bookRepository.updateToClosedStatus(
        bookId,
        BookStatus.COMPLETED,
        score,
        comment,
        transaction
      );

      // 4.2 Insert BookStatusHistory
      await this.bookStatusHistoryRepository.create(
        {
          bookId,
          oldStatus: book.status,
          newStatus: BookStatus.COMPLETED,
          readingCycle: book.currentReadingCycle
        },
        transaction
      );

      await transaction.commit();

      // Step 5: Reload book to get updated state
      const updatedBook = await this.bookRepository.getById(bookId);
      return updatedBook;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
