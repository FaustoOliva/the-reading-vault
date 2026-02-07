/**
 * Reading Session Types
 * Type definitions for reading session operations
 */

export interface CreateReadingSessionInput {
  bookId: number;
  pagesRead: number;
  occurredAt?: string;
}

export interface ReadingSession {
  id: number;
  bookId: number;
  pagesRead: number;
  readingCycle: number;
  duration: number | null;
  occurredAt: string;
  createdAt: string;
}
