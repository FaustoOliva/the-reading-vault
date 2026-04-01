import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type {
  AuthorSynergyApiResponse,
  BookSynergyApiResponse,
} from "@/types/ai";

export const aiSynergyKeys = {
  all: ["aiSynergy"] as const,
  book: (bookId: number) => [...aiSynergyKeys.all, "book", bookId] as const,
  author: (authorId: number) =>
    [...aiSynergyKeys.all, "author", authorId] as const,
};

export function useBookSynergy(bookId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: aiSynergyKeys.book(bookId),
    queryFn: () =>
      api.get<BookSynergyApiResponse>(`/api/ai/book/${bookId}/synergy`),
    enabled: enabled && !!bookId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useAuthorSynergy(authorId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: aiSynergyKeys.author(authorId),
    queryFn: () =>
      api.get<AuthorSynergyApiResponse>(`/api/ai/author/${authorId}/synergy`),
    enabled: enabled && !!authorId,
    staleTime: 1000 * 60 * 10,
  });
}
