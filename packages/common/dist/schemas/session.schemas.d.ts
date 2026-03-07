/**
 * Base Zod schemas for Reading Session operations
 * Shared between API and Mobile packages
 */
import { z } from "zod";
/**
 * Base schema for logging a reading session
 * Date/timestamp handling varies by context (API uses ISO strings, Mobile uses Date objects)
 */
export declare const logSessionBaseSchema: z.ZodObject<{
    bookId: z.ZodNumber;
    pagesRead: z.ZodNumber;
}, z.core.$strip>;
export type LogSessionBase = z.infer<typeof logSessionBaseSchema>;
//# sourceMappingURL=session.schemas.d.ts.map