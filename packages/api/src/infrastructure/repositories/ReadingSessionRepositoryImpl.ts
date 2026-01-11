import DatabaseConfig from "../database/DatabaseConfig";
import IReadingSessionRepository from "../../domain/repositories/IReadingSessionRepository";
import { Book } from "../../domain/entities/Book";
import mssql from "mssql";

export class ReadingSessionRepositoryImpl implements IReadingSessionRepository {
  async addReadingSession(bookId: number, pagesRead: number): Promise<number> {
    const pool = await DatabaseConfig.getPool();
    const transaction = new mssql.Transaction(pool);

    try {
      await transaction.begin();
      const request = transaction.request();

      // Insert the reading session
      const insertResult = await request
        .input("book_id", bookId)
        .input("pages_read", pagesRead)
        .query(
          `INSERT INTO ReadingSessions (book_id, pages_read, date)
           OUTPUT INSERTED.id
           VALUES (@book_id, @pages_read, GETDATE())`
        );

      const sessionId = insertResult.recordset && insertResult.recordset[0]
        ? insertResult.recordset[0].id
        : 0;

      // Calculate total pages read for the book
      const sumResult = await request
        .input("book_id_sum", bookId)
        .query(`SELECT ISNULL(SUM(pages_read), 0) AS total_read FROM ReadingSessions WHERE book_id = @book_id_sum`);

      const totalRead = sumResult.recordset && sumResult.recordset[0]
        ? parseInt(sumResult.recordset[0].total_read, 10)
        : 0;

      // Fetch current total_pages and status
      const bookQuery = await request
        .input("book_id_select", bookId)
        .query(`SELECT total_pages, status_id FROM Books WHERE id = @book_id_select`);

      if (!bookQuery.recordset || bookQuery.recordset.length === 0) {
        // No book found - rollback
        await transaction.rollback();
        throw new Error("Book not found during session insertion");
      }

      const bookRow = bookQuery.recordset[0];
      const totalPages = bookRow.total_pages ?? null;
      const currentStatus = bookRow.status_id ?? null;

      // If total_pages defined and reached or exceeded, update status and insert history
      if (totalPages !== null && totalRead >= totalPages) {
        const newStatusId = 3; // COMPLETED

        // Update Books.status_id
        await request
          .input("new_status", newStatusId)
          .input("book_id_update", bookId)
          .query(`UPDATE Books SET status_id = @new_status WHERE id = @book_id_update`);

        // Insert history record
        await request
          .input("book_id_hist", bookId)
          .input("old_status", currentStatus)
          .input("new_status", newStatusId)
          .query(`INSERT INTO BookStatusHistory (book_id, old_status_id, new_status_id, changed_at) VALUES (@book_id_hist, @old_status, @new_status, GETDATE())`);
      }

      await transaction.commit();
      return sessionId;
    } catch (err) {
      try {
        await transaction.rollback();
      } catch (e) {
        // ignore
      }
      throw err;
    }
  }
}

export default ReadingSessionRepositoryImpl;
