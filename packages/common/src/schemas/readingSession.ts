import { z } from "zod";

export const ReadingSessionSchema = z.object({
  id: z.string().uuid(),
  book_id: z.string().uuid(),
  reading_cycle: z.number().int().min(1),
  pages_read: z.number().int().gt(0, "Pages must be greater than 0"),
  occurred_at: z
    .coerce.date()
    .max(new Date(), { message: "Cannot log future sessions" }),
  created_at: z.coerce.date(),
});

export type ReadingSession = z.infer<typeof ReadingSessionSchema>;
