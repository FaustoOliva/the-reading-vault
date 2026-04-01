/**
 * BookTypes Query Hooks
 * React Query hooks for fetching book type data
 *
 * Rules:
 * - Use React Query for server state
 * - Define query keys consistently
 * - Type all responses
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface BookType {
  id: number;
  name: string;
}

/**
 * Query Keys Factory
 */
export const bookTypesKeys = {
  all: ["bookTypes"] as const,
  lists: () => [...bookTypesKeys.all, "list"] as const,
  list: () => [...bookTypesKeys.lists()] as const,
};

/**
 * Hook: Fetch all predefined book types
 */
export function useBookTypes() {
  return useQuery({
    queryKey: bookTypesKeys.list(),
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: BookType[];
      }>("/api/book-types");

      return response.data;
    },
  });
}
