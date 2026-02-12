import { BadRequestError } from "../http/BadRequestError.js";

/**
 * InsufficientPagesError
 * Thrown when trying to complete a book without having read all pages
 * HTTP Status: 400 Bad Request
 */
export class InsufficientPagesError extends BadRequestError {
  constructor(bookId, pagesRead, totalPages) {
    super(
      `Cannot complete book: only ${pagesRead} of ${totalPages} pages read.`,
      { bookId, pagesRead, totalPages }
    );
    this.bookId = bookId;
    this.pagesRead = pagesRead;
    this.totalPages = totalPages;
  }
}
