/**
 * BookStatus Enum
 * Defines all valid book status values in the system
 * 
 * This enum must match the internal_code values in BookStatuses table
 */

export const BookStatus = Object.freeze({
  WISH_LIST: 'WISH_LIST',
  READING: 'READING',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED'
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
