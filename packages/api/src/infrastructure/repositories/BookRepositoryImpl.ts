import { IBookRepository } from "../../domain/repositories/IBookRepository";
import { Book } from "../../domain/entities/Book";
import DatabaseConfig from "../database/DatabaseConfig";

export class BookRepositoryImpl implements IBookRepository {
  async findById(id: string): Promise<Book | null> {
    const pool = await DatabaseConfig.getPool();
    const result = await pool
      .request()
      .input("id", id)
      .query("SELECT Id, Title, Author, Isbn, CreatedAt FROM Books WHERE Id = @id");

    if (!result.recordset || result.recordset.length === 0) return null;

    const row = result.recordset[0];
    return new Book({
      id: row.Id,
      title: row.Title,
      author: row.Author,
      isbn: row.Isbn,
      createdAt: row.CreatedAt,
    });
  }

  async save(book: Book): Promise<void> {
    const pool = await DatabaseConfig.getPool();
    await pool
      .request()
      .input("id", book.id)
      .input("title", book.title)
      .input("author", book.author ?? null)
      .input("isbn", book.isbn ?? null)
      .input("createdAt", book.createdAt)
      .query(
        `INSERT INTO Books (Id, Title, Author, Isbn, CreatedAt) VALUES (@id, @title, @author, @isbn, @createdAt)`
      );
  }
}
