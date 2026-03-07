/**
 * Base Zod schemas for Book Review operations
 * Shared between API and Mobile packages
 */
import { z } from "zod";
import { BookStatus } from "../enums/bookStatus.js";
import { scoreSchema, commentSchema } from "./book.schemas.js";
/**
 * Valid target statuses for book review
 */
export const REVIEW_TARGET_STATUSES = [
  BookStatus.COMPLETED,
  BookStatus.ABANDONED,
];
/**
 * Base schema for reviewing a book (completing or abandoning)
 * Context-agnostic validation
 */
export const reviewBookBaseSchema = z.object({
  targetStatus: z.enum(REVIEW_TARGET_STATUSES),
  score: scoreSchema,
  comment: commentSchema,
});
//# sourceMappingURL=review.schemas.js.map
