/**
 * Genres Query Hooks
 * React Query hooks for fetching genre data
 *
 * Rules:
 * - Use React Query for server state
 * - Define query keys consistently
 * - Type all responses
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface Genre {
  id: number;
  name: string;
}

/**
 * Query Keys Factory
 */
export const genresKeys = {
  all: ["genres"] as const,
  lists: () => [...genresKeys.all, "list"] as const,
  list: () => [...genresKeys.lists()] as const,
};

/**
 * Hook: Fetch all existing genres
 */
export function useGenres() {
  return useQuery({
    queryKey: genresKeys.list(),
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: Genre[];
      }>("/api/genres");

      return response.data;
    },
  });
}
