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

import { BookStatus } from "@reading-vault/common";
import { NotFoundError } from "../errors/index.js";

export class RequestReviewService {
  constructor(pgClient, bookRepository, bookStatusHistoryRepository) {
    this.pgClient = pgClient;
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
    const client = await this.pgClient.beginTransaction();

    try {
      const oldStatus = book.status;
      const newStatus = BookStatus.PENDING_SCORE;
      const currentCycle = book.currentReadingCycle;

      // 3.1 Update book status to PENDING_SCORE
      await this.bookRepository.updateStatus(
        bookId,
        newStatus,
        currentCycle,
        client,
      );

      // 3.2 Insert BookStatusHistory
      await this.bookStatusHistoryRepository.create(
        {
          bookId,
          oldStatus,
          newStatus,
          readingCycle: currentCycle,
        },
        client,
      );

      await client.query("COMMIT");

      // Step 4: Return updated book
      return this.bookRepository.getById(bookId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
