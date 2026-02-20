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

export const BookStatus = Object.freeze({
  WISH_LIST: 'WISH_LIST',
  READING: 'READING',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
  PENDING_SCORE: 'PENDING_SCORE'
});

/**
 * Get all valid status values as array
 */
export function getValidStatuses() {
  return Object.values(BookStatus);
}

/**
 * Check if a status value is valid
 */
export function isValidStatus(status) {
  return getValidStatuses().includes(status);
}
