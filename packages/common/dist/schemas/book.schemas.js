/**
 * Base Zod schemas for Book entity validation
 * Shared between API and Mobile packages
 */
import { z } from "zod";
import { BOOK_STATUS_VALUES } from "../enums/bookStatus.js";
/**
 * Book Status enum schema
 */
export const bookStatusSchema = z.enum(BOOK_STATUS_VALUES);
/**
 * Score validation (0-10 with 0.5 increments)
 */
export const scoreSchema = z.number().min(0).max(10).multipleOf(0.5);
/**
 * Optional score (used in updates)
 */
export const scoreOptionalSchema = scoreSchema.optional();
/**
 * Pages validation (positive integer)
 */
export const pagesSchema = z.number().int().positive();
/**
 * Optional pages (used in updates)
 */
export const pagesOptionalSchema = pagesSchema.optional();
/**
 * ISBN validation
 */
export const isbnSchema = z.string().trim().min(1).max(100);
/**
 * Optional ISBN
 */
export const isbnOptionalSchema = isbnSchema.optional();
/**
 * Book title validation
 */
export const titleSchema = z.string().trim().min(1).max(200);
/**
 * Optional title (used in updates)
 */
export const titleOptionalSchema = titleSchema.optional();
/**
 * Comment validation
 */
export const commentSchema = z.string().trim().max(1000).optional();
/**
 * Author name validation
 */
export const authorNameSchema = z.string().trim().min(1).max(200);
/**
 * Country name validation
 */
export const countryNameSchema = z.string().trim().min(1).max(100);
/**
 * Base schema for updating book metadata
 * Used by both API (direct numbers) and Mobile (adapted to strings)
 */
export const updateBookBaseSchema = z.object({
  title: titleOptionalSchema,
  totalPages: pagesOptionalSchema,
  score: scoreOptionalSchema,
  comment: commentSchema,
});
//# sourceMappingURL=book.schemas.js.map
