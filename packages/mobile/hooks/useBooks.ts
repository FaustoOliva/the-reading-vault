/**
 * Books Query Hooks
 * React Query hooks for fetching and mutating book data
 * 
 * Rules:
 * - Use React Query for server state
 * - Define query keys consistently
 * - Invalidate queries on mutations
 * - Type all responses
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Book, BookDetails, BooksFilter, PaginationParams, CreateBookInput } from '@/types/book';

/**
 * Query Keys Factory
 * Ensures consistent cache invalidation
 */
export const booksKeys = {
  all: ['books'] as const,
  lists: () => [...booksKeys.all, 'list'] as const,
  list: (filters?: BooksFilter, pagination?: PaginationParams) =>
    [...booksKeys.lists(), { filters, pagination }] as const,
  details: () => [...booksKeys.all, 'detail'] as const,
  detail: (id: number) => [...booksKeys.details(), id] as const,
};

/**
 * Build query string from filters and pagination
 */
function buildQueryString(filters?: BooksFilter, pagination?: PaginationParams): string {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.append('status', filters.status);
  }

  if (filters?.authorId) {
    params.append('authorId', filters.authorId.toString());
  }

  if (pagination?.page) {
    params.append('page', pagination.page.toString());
  }

  if (pagination?.limit) {
    params.append('limit', pagination.limit.toString());
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Hook: Fetch books with filters and pagination
 */
export function useBooks(
  filters?: BooksFilter,
  pagination?: PaginationParams
) {
  console.log('📚 useBooks called with:', { filters, pagination });

  return useQuery({
    queryKey: booksKeys.list(filters, pagination),
    queryFn: async () => {
      console.log('🔄 useBooks queryFn executing...');
      const queryString = buildQueryString(filters, pagination);
      const endpoint = `/api/books${queryString}`;
      console.log('🎯 Endpoint:', endpoint);

      const response = await api.get<{
        success: boolean;
        data: Book[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(endpoint);

      console.log('✨ useBooks response:', {
        booksCount: response.data?.length,
        pagination: response.pagination,
      });

      return response;
    },
  });
}

/**
 * Hook: Fetch book details by ID
 */
export function useBookDetails(
  bookId: number,
  options?: Omit<UseQueryOptions<BookDetails>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: booksKeys.detail(bookId),
    queryFn: () => api.get<BookDetails>(`/api/books/${bookId}`),
    enabled: !!bookId,
    ...options,
  });
}

/**
 * Hook: Create a new book
 */
export function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookInput) => api.post<Book>('/api/books', data),
    onSuccess: () => {
      // Invalidate all book lists to show new book
      queryClient.invalidateQueries({ queryKey: booksKeys.lists() });
    },
  });
}
