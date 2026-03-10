/**
 * Last Reading Session Hook
 * React Query hook for fetching the most recent reading session globally
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface LastReadingSessionData {
  id: number;
  bookId: number;
  readingCycle: number;
  pagesRead: number;
  occurredAt: string;
  createdAt: string;
  book: {
    id: number;
    title: string;
    authorName: string;
  };
}

const lastSessionKeys = {
  all: ["lastReadingSession"] as const,
  recent: () => [...lastSessionKeys.all, "recent"] as const,
};

export function useLastReadingSession(
  options?: Omit<
    UseQueryOptions<LastReadingSessionData | null>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: lastSessionKeys.recent(),
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: LastReadingSessionData | null;
      }>("/api/reading-sessions/recent");
      return response.data;
    },
    ...options,
  });
}
