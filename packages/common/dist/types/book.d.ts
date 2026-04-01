/**
 * Domain Type Definitions
 * Shared TypeScript interfaces for Book, Author, Country entities
 */
import { BookStatus } from "../enums/bookStatus.js";
/**
 * Author entity
 */
export interface Author {
  id: number;
  name: string;
  nationality: string | null;
  countryIsoCode?: string | null;
}
/**
 * Country entity
 */
export interface Country {
  id: number;
  name: string;
  isoCode: string;
}
/**
 * Book entity (list view)
 */
export interface Book {
  id: number;
  title: string;
  author: {
    id: number;
    name: string;
    countryIsoCode?: string | null;
  };
  isbn: string | null;
  bookType: string | null;
  genres: string[] | null;
  synopsis: string | null;
  totalPages: number | null;
  publicationYear: number | null;
  status: BookStatus;
  currentReadingCycle: number;
  score: number | null;
  comment: string | null;
  createdAt?: string;
  updatedAt?: string;
}
/**
 * Reading cycle information
 */
export interface ReadingCycle {
  cycle_number: number;
  status: BookStatus;
  sessions_count: number;
  total_pages_read: number;
  first_session: Date | null;
  last_session: Date | null;
  duration_days: number;
}
/**
 * Current cycle statistics
 */
export interface CurrentCycleStats {
  sessions_count: number;
  first_session_date: Date | null;
  last_session_date: Date | null;
  days_elapsed: number;
  velocity: number | null;
  estimated_completion: Date | null;
}
/**
 * Detailed book information with reading stats
 */
export interface BookDetails {
  book: {
    id: number;
    title: string;
    isbn: string | null;
    bookType: string | null;
    genres: string[] | null;
    synopsis: string | null;
    publicationYear: number | null;
    author: {
      id: number;
      name: string;
      nationality: string | null;
      countryIsoCode?: string | null;
    };
    total_pages: number | null;
    status: BookStatus;
    current_reading_cycle: number;
    pages_read_total: number;
    pages_read_in_current_cycle: number;
    score: number | null;
    comment: string | null;
    created_at: Date;
  };
  current_cycle_stats: CurrentCycleStats;
  reading_cycles: ReadingCycle[];
}
/**
 * Input for creating a new book
 */
export interface CreateBookInput {
  title: string;
  isbn?: string;
  totalPages?: number;
  publicationYear?: number;
  bookType?: string;
  genres?: string[];
  synopsis?: string;
  status?: BookStatus;
  score?: number;
  comment?: string;
  author: {
    name: string;
    nationality?: string;
  };
}
/**
 * Input for updating book metadata
 */
export interface UpdateBookInput {
  title?: string;
  totalPages?: number;
  publicationYear?: number;
  bookType?: string;
  genres?: string[];
  synopsis?: string;
  score?: number;
  comment?: string;
}
/**
 * Input for reviewing a book (completing or abandoning)
 */
export interface ReviewBookInput {
  targetStatus: BookStatus.COMPLETED | BookStatus.ABANDONED;
  score: number;
  comment?: string;
}
/**
 * Filters for book list queries
 */
export interface BooksFilter {
  status?: BookStatus;
  statuses?: BookStatus[];
  authorId?: number;
  countryId?: number;
  titleSearch?: string;
  minScore?: number;
  maxScore?: number;
  minPages?: number;
  maxPages?: number;
  publicationYearStart?: number;
  publicationYearEnd?: number;
  startDate?: string;
  endDate?: string;
}
/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}
/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
//# sourceMappingURL=book.d.ts.map
