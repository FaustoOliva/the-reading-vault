/**
 * Book Types
 * Type definitions for Book entities and related operations
 */

export enum BookStatus {
  WISH_LIST = "WISH_LIST",
  READING = "READING",
  COMPLETED = "COMPLETED",
  ABANDONED = "ABANDONED",
  PENDING_SCORE = "PENDING_SCORE",
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

export interface BookDetails {
  book: {
    id: number;
    title: string;
    isbn: string | null;
    author: {
      id: number;
      name: string;
      nationality: string | null;
    };
    total_pages: number | null;
    status: BookStatus;
    currentReadingCycle: number;
    pages_read_total: number;
    pages_read_in_current_cycle: number;
    score: number | null;
    comment: string | null;
    created_at: Date;
  };
  currentReadingCycle: {
    sessions_count: number;
    first_session_date: Date | null;
    last_session_date: Date | null;
    days_elapsed: number;
    velocity: number | null;
    estimated_completion: Date | null;
  };
  reading_cycles: ReadingCycle[];
}

export interface ReadingCycle {
  reading_cycle: number;
  status: BookStatus;
  sessions_count: number;
  pages_read: number;
  first_session_date: Date | null;
  last_session_date: Date | null;
  is_current: boolean;
}

export interface CreateBookInput {
  title: string;
  isbn?: string;
  totalPages?: number;
  status?: BookStatus;
  score?: number;
  comment?: string;
  author: {
    name: string;
    nationality?: string;
  };
}

export interface UpdateBookInput {
  title?: string;
  totalPages?: number;
  score?: number;
  comment?: string;
}

export interface ReviewBookInput {
  targetStatus: BookStatus.COMPLETED | BookStatus.ABANDONED;
  score: number;
  comment?: string;
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
