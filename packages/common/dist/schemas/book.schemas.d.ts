/**
 * Base Zod schemas for Book entity validation
 * Shared between API and Mobile packages
 */
import { z } from "zod";
/**
 * Book Status enum schema
 */
export declare const bookStatusSchema: z.ZodEnum<{
  WISH_LIST: import("../enums/bookStatus.js").BookStatus.WISH_LIST;
  READING: import("../enums/bookStatus.js").BookStatus.READING;
  COMPLETED: import("../enums/bookStatus.js").BookStatus.COMPLETED;
  ABANDONED: import("../enums/bookStatus.js").BookStatus.ABANDONED;
  PENDING_SCORE: import("../enums/bookStatus.js").BookStatus.PENDING_SCORE;
}>;
/**
 * Score validation (0-10 with 0.5 increments)
 */
export declare const scoreSchema: z.ZodNumber;
/**
 * Optional score (used in updates)
 */
export declare const scoreOptionalSchema: z.ZodOptional<z.ZodNumber>;
/**
 * Pages validation (positive integer)
 */
export declare const pagesSchema: z.ZodNumber;
/**
 * Optional pages (used in updates)
 */
export declare const pagesOptionalSchema: z.ZodOptional<z.ZodNumber>;
/**
 * ISBN validation
 */
export declare const isbnSchema: z.ZodString;
/**
 * Optional ISBN
 */
export declare const isbnOptionalSchema: z.ZodOptional<z.ZodString>;
/**
 * Book title validation
 */
export declare const titleSchema: z.ZodString;
/**
 * Optional title (used in updates)
 */
export declare const titleOptionalSchema: z.ZodOptional<z.ZodString>;
/**
 * Comment validation
 */
export declare const commentSchema: z.ZodOptional<z.ZodString>;
/**
 * Author name validation
 */
export declare const authorNameSchema: z.ZodString;
/**
 * Country name validation
 */
export declare const countryNameSchema: z.ZodString;
/**
 * Base schema for updating book metadata
 * Used by both API (direct numbers) and Mobile (adapted to strings)
 */
export declare const updateBookBaseSchema: z.ZodObject<
  {
    title: z.ZodOptional<z.ZodString>;
    totalPages: z.ZodOptional<z.ZodNumber>;
    score: z.ZodOptional<z.ZodNumber>;
    comment: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export type UpdateBookBase = z.infer<typeof updateBookBaseSchema>;
//# sourceMappingURL=book.schemas.d.ts.map
