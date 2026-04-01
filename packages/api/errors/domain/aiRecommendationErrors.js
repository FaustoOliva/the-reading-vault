import { BadRequestError } from "../http/BadRequestError.js";

/**
 * EmptyVaultError
 * Thrown when trying to generate recommendations without any books in the vault
 * HTTP Status: 400 Bad Request
 */
export class EmptyVaultError extends BadRequestError {
  constructor() {
    super("Cannot generate recommendations without books in your vault", {
      code: "EMPTY_VAULT",
    });
  }
}

/**
 * InsufficientDataError
 * Thrown when trying to generate recommendations with insufficient reading history
 * HTTP Status: 400 Bad Request
 */
export class InsufficientDataError extends BadRequestError {
  constructor(current, required) {
    super(
      `Need at least ${required} books to generate recommendations (you have ${current})`,
      { code: "INSUFFICIENT_DATA", current, required },
    );
    this.current = current;
    this.required = required;
  }
}

/**
 * ReaderProfileMinimumBooksError
 * Thrown when profile/recommendations are unavailable because minimum completed+abandoned books were not reached.
 * HTTP Status: 400 Bad Request
 */
export class ReaderProfileMinimumBooksError extends BadRequestError {
  constructor(current, required) {
    super(
      `Reader profile is not available yet. You need at least ${required} completed or abandoned books (you have ${current})`,
      {
        code: "READER_PROFILE_MINIMUM_NOT_MET",
        current,
        required,
      },
    );
    this.current = current;
    this.required = required;
  }
}
