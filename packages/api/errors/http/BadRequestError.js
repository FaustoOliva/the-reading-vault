import { AppError } from "../base/AppError.js";

/**
 * Error 400 - Bad Request
 * Para validaciones, datos inválidos, parámetros incorrectos
 */
export class BadRequestError extends AppError {
  constructor(message = "Solicitud inválida", details = null) {
    super(message, 400);
    this.details = details;
  }
}
