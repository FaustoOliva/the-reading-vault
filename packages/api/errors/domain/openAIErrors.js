/**
 * OpenAI-specific domain errors
 * These errors represent failures in AI service integration
 */

import { AppError } from "../base/AppError.js";

/**
 * Thrown when OpenAI API is unavailable or connection fails
 */
export class OpenAIUnavailableError extends AppError {
  constructor(details = "") {
    super(
      "OpenAI API is currently unavailable. Profile will be saved without semantic summary.",
      503,
      true,
    );
    this.name = "OpenAIUnavailableError";
    this.code = "OPENAI_UNAVAILABLE";
    this.details = details;
  }
}

/**
 * Thrown when OpenAI request times out
 */
export class OpenAITimeoutError extends AppError {
  constructor(timeout) {
    super(
      `OpenAI request timed out after ${timeout}ms. Profile will be saved without semantic summary.`,
      504,
      true,
    );
    this.name = "OpenAITimeoutError";
    this.code = "OPENAI_TIMEOUT";
    this.timeout = timeout;
  }
}

/**
 * Thrown when OpenAI rate limit is exceeded
 */
export class OpenAIRateLimitError extends AppError {
  constructor() {
    super("OpenAI rate limit exceeded. Please try again later.", 429, true);
    this.name = "OpenAIRateLimitError";
    this.code = "OPENAI_RATE_LIMIT";
  }
}

/**
 * Thrown when OpenAI API key is invalid
 */
export class OpenAIInvalidAPIKeyError extends AppError {
  constructor() {
    super(
      "Invalid OpenAI API key. Please check your configuration.",
      401,
      true,
    );
    this.name = "OpenAIInvalidAPIKeyError";
    this.code = "OPENAI_INVALID_KEY";
  }
}
