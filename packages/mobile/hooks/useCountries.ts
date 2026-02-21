/**
 * Countries Query Hooks
 * React Query hooks for fetching country data
 *
 * Rules:
 * - Use React Query for server state
 * - Define query keys consistently
 * - Type all responses
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Country } from "@/types/country";

/**
 * Query Keys Factory
 */
export const countriesKeys = {
  all: ["countries"] as const,
  lists: () => [...countriesKeys.all, "list"] as const,
  list: (filters?: { nameLike?: string }) =>
    [...countriesKeys.lists(), filters] as const,
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
 * Hook: Fetch all countries with optional filtering
 */
export function useCountries(filters?: { nameLike?: string }) {
  return useQuery({
    queryKey: countriesKeys.list(filters),
    queryFn: async () => {
      const queryString = buildQueryString(filters);
      const endpoint = `/api/countries${queryString}`;

      const response = await api.get<{
        success: boolean;
        data: Country[];
      }>(endpoint);

      return response.data;
    },
  });
}
