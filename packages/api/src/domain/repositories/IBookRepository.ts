import { Book } from "../entities/Book";

export interface IBookRepository {
  findById(id: number): Promise<Book | null>;
  findAll(): Promise<Book[]>;
  save(book: Book): Promise<number | void>;
}
