/**
 * AI Recommendations Hook
 * React Query hook for generating AI-powered book recommendations
 *
 * Rules:
 * - Use useMutation for POST request (non-idempotent)
 * - No cache invalidation (recommendations not persisted)
 * - Type all responses
 * - Handle specific error codes
 *
 * Phase: MVP (5.1 - AI Recommendations)
 */

import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { AIRecommendationsApiResponse } from "@/types/ai";

/**
 * Hook: Generate AI recommendations
 * Calls POST /api/ai/recommendations (no body needed)
 *
 * @returns {Object} Mutation object with mutate, data, isLoading, error
 *
 * @example
 * ```tsx
 * const generateRecommendations = useGenerateRecommendations();
 *
 * const handleGenerate = () => {
 *   generateRecommendations.mutate();
 * };
 *
 * if (generateRecommendations.isLoading) return <Loading />;
 * if (generateRecommendations.error) return <Error error={generateRecommendations.error} />;
 * if (generateRecommendations.data) return <Recommendations data={generateRecommendations.data} />;
 * ```
 */
export function useGenerateRecommendations() {
  return useMutation({
    mutationFn: () =>
      api.postNoBody<AIRecommendationsApiResponse>("/api/ai/recommendations"),

    // No cache invalidation needed (recommendations not persisted)
    // User can regenerate anytime for fresh suggestions
  });
}

/**
 * Hook: Generate recommendations constrained by favorite authors
 * Calls POST /api/ai/recommendations/by-favorite-authors
 */
export function useGenerateFavoriteAuthorRecommendations() {
  return useMutation({
    mutationFn: (topAuthorsLimit: number = 3) =>
      api.post<AIRecommendationsApiResponse>(
        "/api/ai/recommendations/by-favorite-authors",
        {
          topAuthorsLimit,
        },
      ),
  });
}
