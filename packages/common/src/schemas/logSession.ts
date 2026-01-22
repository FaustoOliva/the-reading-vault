import { z } from "zod";

export const LogSessionSchema = z.object({
  book_id: z.string().uuid(),
  pages_read: z.number().int().gt(0, "Pages must be greater than 0"),
  occurred_at: z
    .coerce.date()
    .max(new Date(), { message: "Cannot log future sessions" })
    .optional(),
});

export type LogSessionInput = z.infer<typeof LogSessionSchema>;
