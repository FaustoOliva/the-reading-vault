import { Book } from "../entities/Book";

export interface IBookRepository {
  findById(id: string): Promise<Book | null>;
  save(book: Book): Promise<void>;
}
