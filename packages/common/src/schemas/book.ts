import { z } from "zod";

export const BookStatusSchema = z.enum([
  "WISH_LIST",
  "READING",
  "COMPLETED",
  "ABANDONED",
]);

export const BookSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1, "Title is required").max(255),
    isbn: z.string().trim().min(1, "ISBN is required"),
    author_id: z.string().uuid(),
    total_pages: z.number().int().positive(),
    status: BookStatusSchema,
    current_reading_cycle: z.number().int().min(1),
    pages_read_total: z.number().int().nonnegative(),
    score: z.number().min(0).max(10).nullable().optional(),
    comment: z.string().trim().max(1000).optional().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
  })
  .refine(
    (data) =>
      ![
        "COMPLETED",
        "ABANDONED",
      ].includes(data.status) || data.score !== undefined,
    {
      message: "Score is required when status is COMPLETED or ABANDONED",
      path: ["score"],
    },
  );

export type Book = z.infer<typeof BookSchema>;
export type BookStatus = z.infer<typeof BookStatusSchema>;
