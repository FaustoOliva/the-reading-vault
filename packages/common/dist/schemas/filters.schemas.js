/**
 * Base Zod schemas for Book Filtering operations
 * Shared between API and Mobile packages
 */
import { z } from "zod";
import { bookStatusSchema, scoreSchema, pagesSchema } from "./book.schemas.js";
/**
 * Base schema for filtering books
 * Pagination and coercion handled in context-specific adapters
 */
export const bookFiltersBaseSchema = z.object({
  status: bookStatusSchema.optional(),
  authorId: z.number().int().positive().optional(),
  countryId: z.number().int().positive().optional(),
  titleSearch: z.string().trim().optional(),
  minScore: scoreSchema.optional(),
  maxScore: scoreSchema.optional(),
  minPages: pagesSchema.optional(),
  maxPages: pagesSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
//# sourceMappingURL=filters.schemas.js.map
