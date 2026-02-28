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
