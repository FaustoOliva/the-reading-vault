import { LogSessionSchema } from "@trv/common";
import { z } from "zod";

/**
 * Shared Zod schema from @trv/common (BusinessRules.md Section 3.1).
 */
export const LogSessionInputSchema = LogSessionSchema;

export type LogSessionInput = z.infer<typeof LogSessionInputSchema>;

export default LogSessionInputSchema;
