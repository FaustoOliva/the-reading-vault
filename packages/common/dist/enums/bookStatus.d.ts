/**
 * BookStatus Enum
 * Defines all valid book status values in the system
 *
 * This enum must match the internal_code values in BookStatuses table
 *
 * Lifecycle:
 * WISH_LIST → READING (first session logged)
 * READING → PENDING_SCORE (all pages completed, awaits user review)
 * PENDING_SCORE → COMPLETED (user marks as completed with score)
 * PENDING_SCORE → ABANDONED (user marks as abandoned with score)
 * COMPLETED → READING (re-reading starts new cycle)
 * ABANDONED → READING (manual reopen)
 */
export declare enum BookStatus {
    WISH_LIST = "WISH_LIST",
    READING = "READING",
    COMPLETED = "COMPLETED",
    ABANDONED = "ABANDONED",
    PENDING_SCORE = "PENDING_SCORE"
}
export declare const BookStatusValues: Readonly<{
    WISH_LIST: "WISH_LIST";
    READING: "READING";
    COMPLETED: "COMPLETED";
    ABANDONED: "ABANDONED";
    PENDING_SCORE: "PENDING_SCORE";
}>;
/**
 * Get all valid status values as array
 */
export declare function getValidStatuses(): string[];
/**
 * Check if a status value is valid
 */
export declare function isValidStatus(status: string): boolean;
/**
 * Array of all status values for Zod enum validation
 */
export declare const BOOK_STATUS_VALUES: readonly [BookStatus.WISH_LIST, BookStatus.READING, BookStatus.COMPLETED, BookStatus.ABANDONED, BookStatus.PENDING_SCORE];
export type BookStatusValue = (typeof BOOK_STATUS_VALUES)[number];
//# sourceMappingURL=bookStatus.d.ts.map