/**
 * Book Types
 * Type definitions for Book entities and related operations
 */

export enum BookStatus {
  WISH_LIST = 'WISH_LIST',
  READING = 'READING',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export interface Book {
  id: number;
  title: string;
  author: {
    id: number;
    name: string;
  };
  isbn: string | null;
  totalPages: number | null;
  status: BookStatus;
  currentReadingCycle: number;
  score: number | null;
  comment: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookDetails extends Book {
  authorDetails: {
    id: number;
    name: string;
    nationality: string | null;
  };
  readingSessions: ReadingSession[];
  statusHistory: {
    id: number;
    oldStatus: BookStatus | null;
    newStatus: BookStatus;
    readingCycle: number;
    createdAt: string;
  }[];
}

export interface CreateBookInput {
  title: string;
  authorName: string;
  isbn?: string;
  totalPages?: number;
  status?: BookStatus;
}

export interface BooksFilter {
  status?: BookStatus;
  authorId?: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ReadingSession {
  id: number;
  pagesRead: number;
  readingCycle: number;
  occurredAt: string;
  createdAt: string;
}
