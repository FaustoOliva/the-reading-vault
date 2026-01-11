import { IBookRepository } from "../../domain/repositories/IBookRepository";
import { Book } from "../../domain/entities/Book";

export class GetAllBooks {
  constructor(private bookRepo: IBookRepository) {}

  async execute(): Promise<Book[]> {
    return this.bookRepo.findAll();
  }
}

export default GetAllBooks;
