import { useCallback, useEffect, useState } from 'react';
import { Book } from '../../domain/entities/Book';
import ApiBookRepository from '../../infrastructure/repositories/ApiBookRepository';

export type UseBooksResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useBooks(): UseBooksResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiBookRepository.getAll();
      setBooks(data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const refresh = useCallback(async () => fetch(), [fetch]);

  return { books, loading, error, refresh };
}

export default useBooks;
