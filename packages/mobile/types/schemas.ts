/**
 * Validation Schemas
 * Zod schemas for form validation with type-safety
 *
 * Rules:
 * - All schemas export both the schema and inferred type
 * - Error messages are user-friendly
 * - Validation logic matches business rules
 * - Schemas are reusable across forms
 * - Base schemas imported from @reading-vault/common
 * - Form-specific adapters handle string inputs and UX messages
 */

import { z } from "zod";
import {
  BookStatus,
  REVIEW_TARGET_STATUSES,
  titleSchema,
  authorNameSchema,
  countryNameSchema,
  isbnOptionalSchema,
  commentSchema,
  bookStatusSchema,
} from "@reading-vault/common";
import { numericString, asFormDate } from "../adapters/formSchemas";

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
  title: titleSchema,
  authorName: authorNameSchema,
  countryName: countryNameSchema.optional(),
  isbn: z.string().optional(),
  totalPages: numericString({
    positive: true,
    integer: true,
    fieldName: "Total pages",
    required: false,
  }),
  status: bookStatusSchema.default(BookStatus.WISH_LIST),
  score: numericString({
    min: 0,
    max: 10,
    multipleOf: 0.5,
    fieldName: "Score",
    required: false,
  }),
  comment: commentSchema,
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
  pagesRead: numericString({
    positive: true,
    integer: true,
    fieldName: "Pages read",
    required: true,
  }),
  sessionDate: asFormDate({
    required: true,
    disallowFuture: true,
    fieldName: "Session date",
  }),
  duration: numericString({
    min: 0,
    fieldName: "Duration",
    required: false,
  }),
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
  title: titleSchema.optional(),
  totalPages: numericString({
    positive: true,
    integer: true,
    fieldName: "Total pages",
    required: false,
  }),
  score: numericString({
    min: 0,
    max: 10,
    multipleOf: 0.5,
    fieldName: "Score",
    required: false,
  }),
  comment: commentSchema,
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
  targetStatus: z.enum(REVIEW_TARGET_STATUSES, {
    message: "Please select Complete or Abandon",
  }),
  score: numericString({
    min: 0,
    max: 10,
    multipleOf: 0.5,
    fieldName: "Score",
    required: true,
  }),
  comment: commentSchema,
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
    status: bookStatusSchema.optional(),
    authorId: z.number().optional(),
    countryId: z.number().optional(),
    minScore: numericString({
      min: 0,
      max: 10,
      multipleOf: 0.5,
      fieldName: "Min score",
      required: false,
    }),
    maxScore: numericString({
      min: 0,
      max: 10,
      multipleOf: 0.5,
      fieldName: "Max score",
      required: false,
    }),
    minPages: numericString({
      positive: true,
      integer: true,
      fieldName: "Min pages",
      required: false,
    }),
    maxPages: numericString({
      positive: true,
      integer: true,
      fieldName: "Max pages",
      required: false,
    }),
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
