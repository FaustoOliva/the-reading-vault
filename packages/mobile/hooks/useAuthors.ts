/**
 * Authors Query Hooks
 * React Query hooks for fetching author data
 *
 * Rules:
 * - Use React Query for server state
 * - Define query keys consistently
 * - Type all responses
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Author } from "@/types/author";

/**
 * Query Keys Factory
 */
export const authorsKeys = {
  all: ["authors"] as const,
  lists: () => [...authorsKeys.all, "list"] as const,
  list: (filters?: { nameLike?: string }) =>
    [...authorsKeys.lists(), filters] as const,
};

/**
 * Build query string from filters
 */
function buildQueryString(filters?: { nameLike?: string }): string {
  const params = new URLSearchParams();

  if (filters?.nameLike) {
    params.append("nameLike", filters.nameLike);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * Hook: Fetch all authors with optional filtering
 */
export function useAuthors(filters?: { nameLike?: string }) {
  return useQuery({
    queryKey: authorsKeys.list(filters),
    queryFn: async () => {
      const queryString = buildQueryString(filters);
      const endpoint = `/api/authors${queryString}`;

      const response = await api.get<{
        success: boolean;
        data: Author[];
      }>(endpoint);

      return response.data;
    },
  });
}
