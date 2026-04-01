import { BadRequestError } from "../http/BadRequestError.js";

/**
 * MissingScoreError
 * Thrown when trying to mark a book as completed or abandoned without providing a score
 * HTTP Status: 400 Bad Request
 */
export class MissingScoreError extends BadRequestError {
  constructor(bookId, targetStatus) {
    super(
      `Score is required when marking book as ${targetStatus.toLowerCase()}.`,
      { bookId, targetStatus },
    );
    this.bookId = bookId;
    this.targetStatus = targetStatus;
  }
}
