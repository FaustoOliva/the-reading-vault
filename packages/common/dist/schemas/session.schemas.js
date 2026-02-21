/**
 * Base Zod schemas for Reading Session operations
 * Shared between API and Mobile packages
 */
import { z } from "zod";
import { pagesSchema } from "./book.schemas.js";
/**
 * Base schema for logging a reading session
 * Date/timestamp handling varies by context (API uses ISO strings, Mobile uses Date objects)
 */
export const logSessionBaseSchema = z.object({
  bookId: z.number().int().positive(),
  pagesRead: pagesSchema,
});
//# sourceMappingURL=session.schemas.js.map
