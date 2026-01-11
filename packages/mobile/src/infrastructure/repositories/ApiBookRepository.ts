import { Book } from '../../domain/entities/Book';
import apiClient from '../api/apiClient';

export class ApiBookRepository {
  async getAll(): Promise<Book[]> {
    const response = await apiClient.get<Book[]>('/books');
    return response.data ?? [];
  }
}

const apiBookRepository = new ApiBookRepository();
export default apiBookRepository;
