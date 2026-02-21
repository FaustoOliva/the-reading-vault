/**
 * Reading Session Mutation Hooks
 * React Query hooks for creating reading sessions
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  CreateReadingSessionInput,
  ReadingSession,
} from "@/types/reading-session";
import { booksKeys } from "./useBooks";
import { kpiKeys } from "./useKPIs";
import { bookStatsKeys } from "./useBookStats";

/**
 * Hook: Create a reading session
 */
export function useCreateReadingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReadingSessionInput) =>
      api.post<ReadingSession>("/api/reading-sessions", data),
    onSuccess: (_, variables) => {
      // Invalidate books list (status might have changed)
      queryClient.invalidateQueries({ queryKey: booksKeys.lists() });

      // Invalidate specific book details
      queryClient.invalidateQueries({
        queryKey: booksKeys.detail(variables.bookId),
      });

      // Invalidate KPIs (pages read, sessions count, streaks change)
      queryClient.invalidateQueries({ queryKey: kpiKeys.all });

      // Invalidate book stats
      queryClient.invalidateQueries({
        queryKey: bookStatsKeys.detail(variables.bookId),
      });
    },
  });
}
