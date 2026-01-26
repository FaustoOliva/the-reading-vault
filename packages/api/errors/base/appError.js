/**
 * Clase base para todos los errores de la aplicación
 * Extiende Error nativo de JavaScript con propiedades adicionales
 */
export class AppError extends Error {
  /**
   * @param {string} message - Mensaje de error
   * @param {number} statusCode - Código HTTP (400, 404, etc.)
   * @param {boolean} isOperational - true = error esperado, false = bug/error crítico
   */
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Mantiene el stack trace limpio
    Error.captureStackTrace(this, this.constructor);
  }
}