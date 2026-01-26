import { AppError } from "../base/AppError.js";

/**
 * Error 409 - Conflict
 * Para duplicados, conflictos de estado (ej: email ya existe)
 */
export class ConflictError extends AppError {
  constructor(message = "Conflicto con recurso existente", resource = null) {
    super(message, 409);
    this.resource = resource;
  }
}
