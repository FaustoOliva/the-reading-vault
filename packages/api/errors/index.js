/**
 * Exportación centralizada de todos los errores
 * Usar: import { NotFoundError, BadRequestError } from '../errors/index.js';
 */

// Base
export { AppError } from "./base/AppError.js";

// HTTP Errors
export { BadRequestError } from "./http/BadRequestError.js";
export { NotFoundError } from "./http/NotFoundError.js";
export { ConflictError } from "./http/ConflictError.js";
export { ForbiddenError } from "./http/ForbiddenError.js";

// Domain Errors
export { BookClosedError } from "./domain/BookClosedError.js";
export { InvalidStateTransitionError } from "./domain/InvalidStateTransitionError.js";
