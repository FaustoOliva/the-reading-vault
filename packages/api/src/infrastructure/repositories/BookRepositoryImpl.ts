import { IBookRepository } from "../../domain/repositories/IBookRepository";
import { Book } from "../../domain/entities/Book";
import DatabaseConfig from "../database/DatabaseConfig";

export class BookRepositoryImpl implements IBookRepository {
  async findById(id: number): Promise<Book | null> {
    const pool = await DatabaseConfig.getPool();
    const result = await pool
      .request()
      .input("id", id)
      .query(
        `SELECT B.id, B.title, B.score, B.author_id,
                A.name AS author_name,
                S.display_name AS status_name,
                S.ui_color
         FROM Books B
         LEFT JOIN Authors A ON B.author_id = A.id
         LEFT JOIN BookStatuses S ON B.status_id = S.id
         WHERE B.id = @id`
      );

    if (!result.recordset || result.recordset.length === 0) return null;
    const row = result.recordset[0];

    return new Book({
      id: row.id,
      author_id: row.author_id,
      title: row.title,
      score: row.score,
      author_name: row.author_name ?? null,
      status_name: row.status_name ?? null,
      ui_color: row.ui_color ?? null,
    });
  }

  async findAll(): Promise<Book[]> {
    const pool = await DatabaseConfig.getPool();
    const result = await pool
      .request()
      .query(
        `SELECT B.id, B.title, B.score, B.author_id,
                A.name AS author_name,
                S.display_name AS status_name,
                S.ui_color
         FROM Books B
         LEFT JOIN Authors A ON B.author_id = A.id
         LEFT JOIN BookStatuses S ON B.status_id = S.id
         ORDER BY B.id DESC`
      );

    if (!result.recordset || result.recordset.length === 0) return [];

    return result.recordset.map((row: any) =>
      new Book({
        id: row.id,
        author_id: row.author_id,
        title: row.title,
        score: row.score,
        author_name: row.author_name ?? null,
        status_name: row.status_name ?? null,
        ui_color: row.ui_color ?? null,
      })
    );
  }

  async save(book: Book): Promise<number | void> {
    const pool = await DatabaseConfig.getPool();

    // If id is provided, perform update
    if (book.id) {
      await pool
        .request()
        .input("id", book.id)
        .input("author_id", book.author_id ?? null)
        .input("title", book.title)
        .input("isbn", book.isbn ?? null)
        .input("total_pages", book.total_pages ?? null)
        .input("status_id", book.status_id ?? null)
        .input("score", book.score ?? null)
        .input("comment", book.comment ?? null)
        .query(
          `UPDATE Books SET author_id=@author_id, title=@title, isbn=@isbn, total_pages=@total_pages, status_id=@status_id, score=@score, comment=@comment WHERE id=@id`
        );
      return book.id;
    }

    // Insert new book and return inserted id
    const insertResult = await pool
      .request()
      .input("author_id", book.author_id ?? null)
      .input("title", book.title)
      .input("isbn", book.isbn ?? null)
      .input("total_pages", book.total_pages ?? null)
      .input("status_id", book.status_id ?? null)
      .input("score", book.score ?? null)
      .input("comment", book.comment ?? null)
      .query(
        `INSERT INTO Books (author_id, title, isbn, total_pages, status_id, score, comment) OUTPUT INSERTED.id VALUES (@author_id, @title, @isbn, @total_pages, @status_id, @score, @comment)`
      );

    const insertedId =
      insertResult.recordset && insertResult.recordset[0]
        ? insertResult.recordset[0].id
        : undefined;
    return insertedId;
  }
}
