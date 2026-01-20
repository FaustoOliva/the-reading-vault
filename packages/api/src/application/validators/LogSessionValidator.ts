import { z } from "zod";

/**
 * LogSessionInput Zod Schema
 *
 * Validates input for the LogSessionUseCase:
 * - book_id: Integer reference to existing book
 * - pages_read: Integer > 0, pages read in this session
 * - occurred_at: Optional timestamp, must not be in the future
 *
 * Per BusinessRules.md Section 3.1: Input Validation
 */
export const LogSessionInputSchema = z.object({
  book_id: z.number().int().positive("book_id must be a positive integer"),
  pages_read: z.number().int().gt(0, "Pages must be greater than 0"),
  occurred_at: z
    .union([z.date(), z.string().datetime()])
    .transform((val) => (typeof val === "string" ? new Date(val) : val))
    .refine((date) => date <= new Date(), {
      message: "Cannot log future sessions",
    })
    .optional()
    .nullable(),
});

export type LogSessionInput = z.infer<typeof LogSessionInputSchema>;

export default LogSessionInputSchema;
