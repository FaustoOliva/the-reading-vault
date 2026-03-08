/**
 * KPI Query Hooks
 * React Query hooks for fetching global reading KPIs
 *
 * Rules:
 * - Use React Query for server state
 * - Define query keys consistently
 * - Invalidate queries on mutations
 * - Type all responses
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

/**
 * Global KPIs Data Structure
 */
export interface GlobalReadingKPIs {
  // Volume metrics
  total_books: number;
  books_completed: number;
  books_in_progress: number;
  books_abandoned: number;

  // Reading activity
  total_sessions: number;
  total_pages_read: number;

  // Averages
  average_pages_per_session: number;
  average_sessions_per_day: number;
  average_pages_per_day: number;

  // Velocity & consistency
  current_streak: number;
  longest_streak: number;
  reading_days: number;
  consistency_rate: number;

  // Completion metrics
  completion_rate: number;
  average_days_to_complete: number | null;

  // Score analytics
  average_score: number | null;
  books_rated: number;

  // Completed-books insights
  library_insights: {
    most_read_author: {
      author_name: string;
      books_completed: number;
    } | null;
    fastest_book: {
      id: number;
      title: string;
      author_name: string;
      total_pages: number | null;
      days_to_finish: number;
      pages_per_day: number | null;
    } | null;
    slowest_book: {
      id: number;
      title: string;
      author_name: string;
      total_pages: number | null;
      days_to_finish: number;
      pages_per_day: number | null;
    } | null;
    longest_book: {
      id: number;
      title: string;
      author_name: string;
      total_pages: number;
    } | null;
    shortest_book: {
      id: number;
      title: string;
      author_name: string;
      total_pages: number;
    } | null;
    highest_rated_book: {
      id: number;
      title: string;
      author_name: string;
      score: number;
    } | null;
    lowest_rated_book: {
      id: number;
      title: string;
      author_name: string;
      score: number;
    } | null;
  };
}

export interface KPIResponse {
  kpis: GlobalReadingKPIs;
  period: {
    from: string;
    to: string;
    days: number;
  };
}

/**
 * Query Keys Factory
 * Ensures consistent cache invalidation
 */
export const kpiKeys = {
  all: ["kpis"] as const,
  global: () => [...kpiKeys.all, "global"] as const,
};

/**
 * Hook: Fetch global reading KPIs
 */
export function useGlobalKPIs() {
  return useQuery({
    queryKey: kpiKeys.global(),
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: KPIResponse;
      }>("/api/kpis/global");

      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook to invalidate KPIs cache
 * Call this after book or session mutations
 */
export function useInvalidateKPIs() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: kpiKeys.all });
  };
}
