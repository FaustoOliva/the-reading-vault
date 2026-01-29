import { AppError } from "../base/AppError.js";

/**
 * Error 403 - Forbidden
 * Book is closed (abandoned or completed) and cannot accept new sessions
 */
export class ForbiddenError extends AppError {
  constructor(message = "Operation forbidden", resource = null) {
    super(message, 403);
    this.resource = resource;
  }
}
