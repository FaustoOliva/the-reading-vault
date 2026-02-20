/**
 * RequestReviewService (Manual Review Request Use Case)
 * Transitions book from READING to PENDING_SCORE manually
 * 
 * Use Case:
 * - User wants to abandon book without completing all pages
 * - User completes reading but book doesn't auto-transition (e.g., no totalPages)
 * 
 * Responsibilities:
 * - Validate book is in READING status
 * - Transition to PENDING_SCORE
 * - Create history entry
 * 
 * Rules:
 * - Only READING → PENDING_SCORE allowed
 * - No score required at this stage (will be required on review)
 * - Uses transaction for atomicity
 */

import sql from "mssql";
import { BookStatus } from "../models/BookStatus.js";
import { NotFoundError } from "../errors/index.js";

export class RequestReviewService {
  constructor(mssqlClient, bookRepository, bookStatusHistoryRepository) {
    this.mssqlClient = mssqlClient;
    this.bookRepository = bookRepository;
    this.bookStatusHistoryRepository = bookStatusHistoryRepository;
  }

  /**
   * Execute manual review request
   * @param {number} bookId - Book identifier
   * @returns {Promise<Book>} Updated book entity
   * @throws {BookNotFoundError} if book doesn't exist
   * @throws {InvalidStateTransitionError} if book is not READING
   */
  async execute(bookId) {
    // Step 1: Load book
    const book = await this.bookRepository.getById(bookId);

    if (!book) {
      throw new NotFoundError("Book", bookId);
    }

    // Step 2: Domain validation - Delegate to Book entity
    book.ensureCanRequestReview();

    // Step 3: Transition within transaction
    const pool = await this.mssqlClient.getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const oldStatus = book.status;
      const newStatus = BookStatus.PENDING_SCORE;
      const currentCycle = book.currentReadingCycle;

      // 3.1 Update book status to PENDING_SCORE
      await this.bookRepository.updateStatus(
        bookId,
        newStatus,
        currentCycle,
        transaction
      );

      // 3.2 Insert BookStatusHistory
      await this.bookStatusHistoryRepository.create(
        {
          bookId,
          oldStatus,
          newStatus,
          readingCycle: currentCycle,
        },
        transaction
      );

      await transaction.commit();

      // Step 4: Return updated book
      return this.bookRepository.getById(bookId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
