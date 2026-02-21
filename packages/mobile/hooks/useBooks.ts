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
import { Book, BookDetails, BooksFilter, PaginationParams, CreateBookInput, UpdateBookInput, ReviewBookInput } from '@/types/book';
import { kpiKeys } from './useKPIs';
import { bookStatsKeys } from './useBookStats';

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

  if (filters?.countryId) {
    params.append('countryId', filters.countryId.toString());
  }

  if (filters?.titleSearch) {
    params.append('titleSearch', filters.titleSearch);
  }

  if (filters?.minScore !== undefined) {
    params.append('minScore', filters.minScore.toString());
  }

  if (filters?.maxScore !== undefined) {
    params.append('maxScore', filters.maxScore.toString());
  }

  if (filters?.minPages !== undefined) {
    params.append('minPages', filters.minPages.toString());
  }

  if (filters?.maxPages !== undefined) {
    params.append('maxPages', filters.maxPages.toString());
  }

  if (filters?.startDate) {
    // Convert to ISO 8601 datetime format if needed
    const startDateTime = filters.startDate.includes('T') 
      ? filters.startDate 
      : `${filters.startDate}T00:00:00Z`;
    params.append('startDate', startDateTime);
  }

  if (filters?.endDate) {
    // Convert to ISO 8601 datetime format if needed
    const endDateTime = filters.endDate.includes('T') 
      ? filters.endDate 
      : `${filters.endDate}T23:59:59Z`;
    params.append('endDate', endDateTime);
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
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: BookDetails;
      }>(`/api/books/${bookId}`);
      return response.data;
    },
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
      // Invalidate KPIs (total books count changes)
      queryClient.invalidateQueries({ queryKey: kpiKeys.all });
    },
  });
}

/**
 * Hook: Update book metadata
 */
export function useUpdateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBookInput }) =>
      api.put<{ success: boolean; data: Book }>(`/api/books/${id}`, data),
    onSuccess: (_, variables) => {
      // Invalidate book details and lists
      queryClient.invalidateQueries({ queryKey: booksKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: booksKeys.lists() });
      // Invalidate book stats
      queryClient.invalidateQueries({ queryKey: bookStatsKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook: Review a PENDING_SCORE book (mark as COMPLETED or ABANDONED with score)
 */
export function useReviewBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReviewBookInput }) =>
      api.request<{ success: boolean; data: Book }>(`/api/books/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      // Invalidate book details and lists
      queryClient.invalidateQueries({ queryKey: booksKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: booksKeys.lists() });
      // Invalidate KPIs (completion stats change)
      queryClient.invalidateQueries({ queryKey: kpiKeys.all });
      // Invalidate book stats
      queryClient.invalidateQueries({ queryKey: bookStatsKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook: Reopen an ABANDONED book
 */
export function useReopenBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      api.request<{ success: boolean; data: Book }>(`/api/books/${id}/reopen`, {
        method: 'PATCH',
      }),
    onSuccess: (_, bookId) => {
      // Invalidate book details and lists
      queryClient.invalidateQueries({ queryKey: booksKeys.detail(bookId) });
      queryClient.invalidateQueries({ queryKey: booksKeys.lists() });
      // Invalidate KPIs (status changes)
      queryClient.invalidateQueries({ queryKey: kpiKeys.all });
      // Invalidate book stats
      queryClient.invalidateQueries({ queryKey: bookStatsKeys.detail(bookId) });
    },
  });
}

/**
 * Hook: Request review (manual transition from READING to PENDING_SCORE)
 * Use case: User wants to abandon book without completing all pages
 */
export function useRequestReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      api.request<{ success: boolean; data: Book }>(`/api/books/${id}/request-review`, {
        method: 'PATCH',
      }),
    onSuccess: (_, bookId) => {
      // Invalidate book details and lists
      queryClient.invalidateQueries({ queryKey: booksKeys.detail(bookId) });
      queryClient.invalidateQueries({ queryKey: booksKeys.lists() });
      // Invalidate KPIs (status changes)
      queryClient.invalidateQueries({ queryKey: kpiKeys.all });
      // Invalidate book stats
      queryClient.invalidateQueries({ queryKey: bookStatsKeys.detail(bookId) });
    },
  });
}
