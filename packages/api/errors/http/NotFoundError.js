import { AppError } from "../base/AppError.js";

/**
 * Error 404 - Not Found
 * Recurso no encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource = "Recurso", id = null) {
    const message = id
      ? `${resource} no encontrado: ${id}`
      : `${resource} no encontrado`;

    super(message, 404);
    this.resource = resource;
    this.id = id;
  }
}
