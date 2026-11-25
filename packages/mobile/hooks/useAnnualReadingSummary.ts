/**
 * Annual Reading Summary Query Hook
 * React Query hook for the year-scoped reading statistics
 *
 * Rules:
 * - Use React Query for server state
 * - Keep annual queries under the "kpis" key so existing mutations
 *   invalidate them automatically
 * - Type the response explicitly
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { kpiKeys } from "./useKPIs";

export interface AnnualCycleSummary {
  book_id: number;
  title: string;
  author: string;
  reading_cycle: number;
  finished_at: string;
  sessions: number;
  days: number | null;
  pages_read: number;
  pages_per_day: number | null;
  total_pages: number | null;
  score: number | null;
  has_session_data: boolean;
}

export interface AnnualReadingHighlights {
  fastest_finish: AnnualCycleSummary | null;
  longest_book: AnnualCycleSummary | null;
  highest_rated: AnnualCycleSummary | null;
}

/**
 * Pages read per month of the selected year.
 * Scope: every session dated in the year, including books still in progress.
 * Each month is independent, so the series can rise or fall.
 */
export interface MonthlyReadingActivity {
  month: number;
  pages_read: number;
}

export interface AnnualReadingSummary {
  year: number;
  available_years: number[];
  books_finished: number;
  pages_read: number;
  reading_days: number;
  average_pages_per_day: number | null;
  cycles: AnnualCycleSummary[];
  highlights: AnnualReadingHighlights;
  monthly_activity: MonthlyReadingActivity[];
}

export const annualSummaryKeys = {
  detail: (year: number) => [...kpiKeys.all, "annual", year] as const,
};

/**
 * Hook: Fetch the annual reading summary for a year
 */
export function useAnnualReadingSummary(year: number) {
  return useQuery({
    queryKey: annualSummaryKeys.detail(year),
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: AnnualReadingSummary;
      }>(`/api/kpis/annual?year=${year}`);

      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
