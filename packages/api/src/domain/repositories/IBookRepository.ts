import { Book } from "../entities/Book";

export interface IBookRepository {
  findById(id: number): Promise<Book | null>;
  findAll(): Promise<Book[]>;
  save(book: Book): Promise<number | void>;
  updateStatus(bookId: number, statusId: number, tx?: any): Promise<void>;
  incrementCurrentCycle(bookId: number, tx?: any): Promise<number>;
}
