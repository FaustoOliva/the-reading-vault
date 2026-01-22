import { z } from "zod";

const authorFieldSchema = z
  .string()
  .trim()
  .min(1, "Author name is required when provided")
  .max(255);

export const CreateBookSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(255),
    isbn: z.string().trim().min(1, "ISBN is required"),
    total_pages: z.number().int().positive(),
    author_id: z.string().uuid().optional(),
    author_name: authorFieldSchema.optional(),
    comment: z.string().trim().max(1000).optional(),
    initial_session: z
      .object({
        pages_read: z.number().int().gt(0, "Pages must be greater than 0"),
        occurred_at: z
          .coerce.date()
          .max(new Date(), { message: "Cannot log future sessions" })
          .optional(),
      })
      .optional(),
  })
  .refine(
    (data) => Boolean(data.author_id || data.author_name),
    {
      message: "Provide either author_id or author_name",
      path: ["author_name"],
    },
  );

export type CreateBookInput = z.infer<typeof CreateBookSchema>;
