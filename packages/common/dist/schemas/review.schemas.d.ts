/**
 * Base Zod schemas for Book Review operations
 * Shared between API and Mobile packages
 */
import { z } from "zod";
import { BookStatus } from "../enums/bookStatus.js";
/**
 * Valid target statuses for book review
 */
export declare const REVIEW_TARGET_STATUSES: readonly [
  BookStatus.COMPLETED,
  BookStatus.ABANDONED,
];
/**
 * Base schema for reviewing a book (completing or abandoning)
 * Context-agnostic validation
 */
export declare const reviewBookBaseSchema: z.ZodObject<
  {
    targetStatus: z.ZodEnum<{
      COMPLETED: BookStatus.COMPLETED;
      ABANDONED: BookStatus.ABANDONED;
    }>;
    score: z.ZodNumber;
    comment: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export type ReviewBookBase = z.infer<typeof reviewBookBaseSchema>;
//# sourceMappingURL=review.schemas.d.ts.map
