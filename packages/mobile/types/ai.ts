/**
 * AI Types
 * Type definitions for AI-powered features
 *
 * Phase: MVP (5.1 - AI Recommendations)
 */

/**
 * Single book recommendation
 */
export interface BookRecommendation {
  title: string;
  author: string;
  synopsis: string;
  compatibilityScore: number; // 60-95
  reasoning: string;
}

/**
 * AI Recommendations Response
 */
export interface AIRecommendationsResponse {
  recommendations: BookRecommendation[];
  tokensUsed: number;
  generatedAt: string; // ISO 8601
  inputMode: "semantic" | "structured";
}

/**
 * API Response wrapper
 */
export interface AIRecommendationsApiResponse {
  success: boolean;
  data: AIRecommendationsResponse;
}

/**
 * Error codes for AI recommendations
 */
export enum AIRecommendationError {
  EMPTY_VAULT = "EMPTY_VAULT",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
  READER_PROFILE_MINIMUM_NOT_MET = "READER_PROFILE_MINIMUM_NOT_MET",
  OPENAI_UNAVAILABLE = "OPENAI_UNAVAILABLE",
  OPENAI_TIMEOUT = "OPENAI_TIMEOUT",
  OPENAI_RATE_LIMIT = "OPENAI_RATE_LIMIT",
}
