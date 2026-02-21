import { ForbiddenError } from "../http/ForbiddenError.js";

/**
 * BookPendingReviewError
 * Thrown when trying to log a session on a book that needs review (PENDING_SCORE status)
 * HTTP Status: 403 Forbidden
 */
export class BookPendingReviewError extends ForbiddenError {
  constructor(bookId) {
    super(
      `Book requires review (score) before logging new sessions. Complete or abandon the book first.`,
      "Book",
    );
    this.bookId = bookId;
  }
}
