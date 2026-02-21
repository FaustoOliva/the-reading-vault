/**
 * Book Statistics Query Hooks
 * React Query hooks for fetching detailed book reading statistics
 * 
 * Rules:
 * - Use React Query for server state
 * - Define query keys consistently
 * - Invalidate queries on mutations
 * - Type all responses
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

/**
 * Reading Cycle Statistics
 */
export interface ReadingCycleStats {
  cycle_number: number;
  pages_read: number;
  sessions_count: number;
  first_session: string;
  last_session: string;
  duration_days: number;
  average_velocity: number;
  completed: boolean;
  completion_date: string | null;
}

/**
 * Current Cycle Statistics
 */
export interface CurrentCycleStats {
  cycle_number: number;
  pages_read: number;
  sessions_count: number;
  first_session: string | null;
  last_session: string | null;
  days_elapsed: number;
  velocity: number | null;
  velocity_7d: number | null;
  velocity_30d: number | null;
  estimated_completion: string | null;
  progress_percent: number | null;
}

/**
 * Overall Book Statistics
 */
export interface OverallBookStats {
  total_pages_read: number;
  total_sessions: number;
  total_cycles: number;
  first_session: string | null;
  last_session: string | null;
  score: number | null;
}

/**
 * Complete Book Reading Statistics
 */
export interface BookReadingStats {
  book: {
    id: number;
    title: string;
    status: string;
    current_cycle: number;
  };
  overall_stats: OverallBookStats;
  current_cycle_stats: CurrentCycleStats;
  cycle_history: ReadingCycleStats[];
}

/**
 * Query Keys Factory
 */
export const bookStatsKeys = {
  all: ['bookStats'] as const,
  detail: (bookId: number) => [...bookStatsKeys.all, bookId] as const,
};

/**
 * Hook: Fetch reading statistics for a specific book
 */
export function useBookStats(bookId: number | undefined) {
  return useQuery({
    queryKey: bookStatsKeys.detail(bookId as number),
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: BookReadingStats;
      }>(`/api/books/${bookId}/stats`);
      
      return response.data;
    },
    enabled: !!bookId && bookId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes (stats change rarely)
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}
