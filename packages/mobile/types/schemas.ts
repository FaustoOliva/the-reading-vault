/**
 * Validation Schemas
 * Zod schemas for form validation with type-safety
 *
 * Rules:
 * - All schemas export both the schema and inferred type
 * - Error messages are user-friendly
 * - Validation logic matches business rules
 * - Schemas are reusable across forms
 */

import { z } from "zod";
import { BookStatus } from "./book";

/**
 * Create Book Schema
 * Validates book creation form data
 *
 * Rules:
 * - Title is required (min 1 char)
 * - Author name is required (min 1 char)
 * - ISBN is optional
 * - Total pages must be positive if provided
 * - Score must be 0-10 if provided
 * - Status defaults to WISH_LIST
 * - Nationality is required only when creating new author
 */
export const createBookSchema = z.object({
  title: z.string().min(1, "Title is required").trim(),
  authorName: z.string().min(1, "Author name is required").trim(),
  countryName: z.string().optional(),
  isbn: z.string().optional(),
  totalPages: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
      "Must be a positive number",
    ),
  status: z.nativeEnum(BookStatus).default(BookStatus.WISH_LIST),
  score: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 10),
      "Score must be between 0 and 10",
    ),
  comment: z.string().optional(),
});

export type CreateBookFormData = z.infer<typeof createBookSchema>;

/**
 * Log Reading Session Schema
 * Validates reading session logging form
 *
 * Rules:
 * - Book ID is required
 * - Pages read must be positive integer
 * - Pages read cannot exceed remaining pages
 * - Session date cannot be in the future
 * - Duration is optional, must be positive if provided
 */
export const logSessionSchema = z.object({
  bookId: z.number({
    message: "Please select a book",
  }),
  pagesRead: z
    .string()
    .min(1, "Pages read is required")
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      "Pages must be greater than zero",
    ),
  sessionDate: z
    .date()
    .refine(
      (date) => date <= new Date(),
      "Session date cannot be in the future",
    ),
  duration: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
      "Duration must be a positive number",
    ),
});

/**
 * Dynamic validation for pages read based on remaining pages
 * Call this separately after schema validation
 */
export const validatePagesAgainstRemaining = (
  pagesRead: number,
  remainingPages: number | null,
): string | null => {
  if (remainingPages !== null && pagesRead > remainingPages) {
    return `Cannot exceed ${remainingPages} remaining pages`;
  }
  return null;
};

export type LogSessionFormData = z.infer<typeof logSessionSchema>;

/**
 * Edit Book Schema
 * Validates book metadata update form
 *
 * Rules:
 * - All fields are optional (partial update)
 * - Title must be non-empty if provided
 * - Total pages must be positive if provided
 * - Score must be 0-10 if provided
 */
export const editBookSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").trim().optional(),
  totalPages: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
      "Must be a positive number",
    ),
  score: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 10),
      "Score must be between 0 and 10",
    ),
  comment: z.string().optional(),
});

export type EditBookFormData = z.infer<typeof editBookSchema>;

/**
 * Review Book Schema
 * Validates book review/completion form
 *
 * Rules:
 * - Score is required (0-10 with 0.5 increments)
 * - Target status must be COMPLETED or ABANDONED
 * - Comment is optional
 */
export const reviewBookSchema = z.object({
  targetStatus: z.enum([BookStatus.COMPLETED, BookStatus.ABANDONED], {
    message: "Please select Complete or Abandon",
  }),
  score: z
    .string()
    .min(1, "Score is required")
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 10,
      "Score must be between 0 and 10",
    )
    .refine(
      (val) => Number(val) % 0.5 === 0,
      "Score must be in 0.5 increments",
    ),
  comment: z.string().optional(),
});

export type ReviewBookFormData = z.infer<typeof reviewBookSchema>;

/**
 * Advanced Filters Schema
 * Validates book filtering form
 *
 * Rules:
 * - All fields are optional
 * - Min/max values must be positive
 * - Min score <= max score
 * - Min pages <= max pages
 * - Start date <= end date
 */
export const advancedFiltersSchema = z
  .object({
    status: z.nativeEnum(BookStatus).optional(),
    authorId: z.number().optional(),
    countryId: z.number().optional(),
    minScore: z
      .string()
      .optional()
      .refine(
        (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
        "Must be a positive number",
      ),
    maxScore: z
      .string()
      .optional()
      .refine(
        (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
        "Must be a positive number",
      ),
    minPages: z
      .string()
      .optional()
      .refine(
        (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
        "Must be a positive number",
      ),
    maxPages: z
      .string()
      .optional()
      .refine(
        (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
        "Must be a positive number",
      ),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  })
  .refine(
    (data) => {
      if (data.minScore && data.maxScore) {
        return Number(data.minScore) <= Number(data.maxScore);
      }
      return true;
    },
    {
      message: "Min score must be less than or equal to max score",
      path: ["minScore"],
    },
  )
  .refine(
    (data) => {
      if (data.minPages && data.maxPages) {
        return Number(data.minPages) <= Number(data.maxPages);
      }
      return true;
    },
    {
      message: "Min pages must be less than or equal to max pages",
      path: ["minPages"],
    },
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "Start date must be before or equal to end date",
      path: ["startDate"],
    },
  );

export type AdvancedFiltersFormData = z.infer<typeof advancedFiltersSchema>;

/**
 * Utility: Extract error messages from Zod validation
 * Converts Zod errors to a flat object for easy form display
 *
 * @param error - ZodError from schema.safeParse()
 * @returns Record<field, error message>
 */
export const getZodErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  error.issues.forEach((err) => {
    const path = err.path.join(".");
    errors[path] = err.message;
  });
  return errors;
};
