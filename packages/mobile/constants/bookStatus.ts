/**
 * Book Status Constants
 * Labels and options for book statuses
 * 
 * NOTE: Colors are now in constants/colors.ts for accessibility
 */

import { BookStatus } from '@/types/book';

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  [BookStatus.WISH_LIST]: 'Wish List',
  [BookStatus.READING]: 'Reading',
  [BookStatus.COMPLETED]: 'Completed',
  [BookStatus.ABANDONED]: 'Abandoned',
};

export const BOOK_STATUS_OPTIONS = [
  { value: '', label: 'All Books' },
  ...Object.values(BookStatus).map((status) => ({
    value: status,
    label: BOOK_STATUS_LABELS[status],
  })),
];
