/**
 * ReviewBookService (Command Use Case)
 * Transitions book from PENDING_SCORE to COMPLETED or ABANDONED with score
 *
 * Responsibilities:
 * - Validate book is in PENDING_SCORE status
 * - Transition to COMPLETED or ABANDONED with mandatory score
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

export class ReviewBookService {
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
   * Execute ReviewBook use case
   * @param {number} bookId - Book ID to review
   * @param {Object} data - { targetStatus: 'COMPLETED'|'ABANDONED', score: number, comment?: string }
   * @returns {Promise<Book>} Updated book entity
   */
  async execute(bookId, data) {
    const { targetStatus, score, comment } = data;

    // Step 1: Load book
    const book = await this.bookRepository.getById(bookId);

    if (!book) {
      throw new NotFoundError("Book", bookId);
    }

    // Step 2: Domain validation - Delegate to Book entity
    book.ensureCanBeReviewed(targetStatus, score);

    // Step 3: Update book and insert history within transaction
    const pool = await this.mssqlClient.getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 3.1 Update book status and score
      await this.bookRepository.updateReview(
        bookId,
        targetStatus,
        score,
        comment,
        transaction,
      );

      // 3.2 Insert BookStatusHistory
      await this.bookStatusHistoryRepository.create(
        {
          bookId,
          oldStatus: book.status,
          newStatus: targetStatus,
          readingCycle: book.currentReadingCycle,
        },
        transaction,
      );

      await transaction.commit();

      // Step 4: Return updated book
      const updatedBook = await this.bookRepository.getById(bookId);

      // Step 5: Mark important profile event (non-blocking)
      if (this.getReaderProfileService) {
        this.getReaderProfileService
          .markImportantEventPending()
          .catch((err) => {
            console.warn(
              "⚠️ Profile event mark failed (non-critical):",
              err.message,
            );
          });
      }

      return updatedBook;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
