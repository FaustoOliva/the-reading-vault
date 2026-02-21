/**
 * Base Zod schemas for Book Filtering operations
 * Shared between API and Mobile packages
 */
import { z } from "zod";
/**
 * Base schema for filtering books
 * Pagination and coercion handled in context-specific adapters
 */
export declare const bookFiltersBaseSchema: z.ZodObject<
  {
    status: z.ZodOptional<
      z.ZodEnum<{
        WISH_LIST: import("../index.js").BookStatus.WISH_LIST;
        READING: import("../index.js").BookStatus.READING;
        COMPLETED: import("../index.js").BookStatus.COMPLETED;
        ABANDONED: import("../index.js").BookStatus.ABANDONED;
        PENDING_SCORE: import("../index.js").BookStatus.PENDING_SCORE;
      }>
    >;
    authorId: z.ZodOptional<z.ZodNumber>;
    countryId: z.ZodOptional<z.ZodNumber>;
    titleSearch: z.ZodOptional<z.ZodString>;
    minScore: z.ZodOptional<z.ZodNumber>;
    maxScore: z.ZodOptional<z.ZodNumber>;
    minPages: z.ZodOptional<z.ZodNumber>;
    maxPages: z.ZodOptional<z.ZodNumber>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export type BookFiltersBase = z.infer<typeof bookFiltersBaseSchema>;
//# sourceMappingURL=filters.schemas.d.ts.map
