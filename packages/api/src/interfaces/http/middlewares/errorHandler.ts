import { Request, Response, NextFunction } from "express";
import BookClosedException from "../../../domain/exceptions/BookClosedException";
import BookNotFoundException from "../../../domain/exceptions/BookNotFoundException";
import DuplicateISBNException from "../../../domain/exceptions/DuplicateISBNException";
import ValidationException from "../../../domain/exceptions/ValidationException";
import MissingScoreException from "../../../domain/exceptions/MissingScoreException";
import ImmutableSessionException from "../../../domain/exceptions/ImmutableSessionException";
import IntegrityConstraintViolation from "../../../domain/exceptions/IntegrityConstraintViolation";

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  let statusCode = 500;
  let message = "Internal Server Error";

  // Handle domain exceptions
  if (err instanceof BookClosedException) {
    statusCode = 403;
    message = err.message;
  } else if (err instanceof BookNotFoundException) {
    statusCode = 404;
    message = err.message;
  } else if (err instanceof DuplicateISBNException) {
    statusCode = 409;
    message = err.message;
  } else if (err instanceof ValidationException) {
    statusCode = 400;
    message = err.message;
  } else if (err instanceof MissingScoreException) {
    statusCode = 400;
    message = err.message;
  } else if (err instanceof ImmutableSessionException) {
    statusCode = 403;
    message = err.message;
  } else if (err instanceof IntegrityConstraintViolation) {
    statusCode = 409;
    message = err.message;
  } else if (err?.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err?.message) {
    message = err.message;
  }

  // Log server-side error details for 5xx errors
  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
    },
  });
}
