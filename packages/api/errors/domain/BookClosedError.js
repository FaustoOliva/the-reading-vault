import { ForbiddenError } from "../http/ForbiddenError.js";

/**
 * BookClosedError
 * Thrown when trying to log a session on a closed book (abandoned or completed)
 * HTTP Status: 403 Forbidden
 */
export class BookClosedError extends ForbiddenError {
  constructor(bookId, status) {
    super(
      `This book is ${status.toLowerCase()} and locked. Manually reopen to continue.`,
      "Book"
    );
    this.bookId = bookId;
    this.bookStatus = status;
  }
}
