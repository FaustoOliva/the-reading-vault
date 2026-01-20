import { IBookRepository } from "../../domain/repositories/IBookRepository";
import IReadingSessionRepository from "../../domain/repositories/IReadingSessionRepository";
import DatabaseConfig from "../../infrastructure/database/DatabaseConfig";
import mssql from "mssql";
import { BookClosedException } from "../../domain/exceptions/BookClosedException";

export class AddReadingSessionUseCase {
  constructor(
    private bookRepo: IBookRepository,
    private sessionRepo: IReadingSessionRepository
  ) {}

  async execute(
    bookId: number,
    pagesRead: number,
    occurredAt?: Date | null
  ): Promise<{ sessionId: number }> {
    if (pagesRead <= 0) throw new Error("pagesRead must be greater than zero");

    const pool = await DatabaseConfig.getPool();
    const transaction = new mssql.Transaction(pool);
    try {
      await transaction.begin();
      const req = transaction.request();

      // Fetch book data
      const bookRes = await req.input("book_id", bookId).query(
        `SELECT id, total_pages, status_id, current_reading_cycle FROM Books WHERE id = @book_id`
      );

      if (!bookRes.recordset || bookRes.recordset.length === 0) {
        await transaction.rollback();
        throw new Error("Book not found");
      }

      const bookRow = bookRes.recordset[0];
      const totalPages = bookRow.total_pages ?? null;
      const statusId = bookRow.status_id;
      let currentCycle = bookRow.current_reading_cycle ?? 1;

      // Handle ABANDONED
      const ABANDONED = 4;
      const WISH_LIST = 1;
      const READING = 2;
      const COMPLETED = 3;

      if (statusId === ABANDONED) {
        await transaction.rollback();
        throw new BookClosedException();
      }

      // Smart transitions
      if (statusId === WISH_LIST) {
        // WISH_LIST -> READING
        await this.bookRepo.updateStatus(bookId, READING, transaction);
        await req
          .input("book_id_hist", bookId)
          .input("old_status", WISH_LIST)
          .input("new_status", READING)
          .query(`INSERT INTO BookStatusHistory (book_id, old_status_id, new_status_id, changed_at) VALUES (@book_id_hist, @old_status, @new_status, GETDATE())`);
      } else if (statusId === COMPLETED) {
        // COMPLETED -> READING and increment cycle
        await this.bookRepo.updateStatus(bookId, READING, transaction);
        const newCycle = await this.bookRepo.incrementCurrentCycle(bookId, transaction);
        currentCycle = newCycle;
        await req
          .input("book_id_hist", bookId)
          .input("old_status", COMPLETED)
          .input("new_status", READING)
          .query(`INSERT INTO BookStatusHistory (book_id, old_status_id, new_status_id, changed_at) VALUES (@book_id_hist, @old_status, @new_status, GETDATE())`);
      }

      // Validate pages read against remaining pages in current cycle
      if (totalPages !== null) {
        const sumRes = await req
          .input("book_id_sum", bookId)
          .input("reading_cycle", currentCycle)
          .query(
            `SELECT ISNULL(SUM(pages_read),0) AS read_in_cycle FROM ReadingSessions WHERE book_id=@book_id_sum AND reading_cycle=@reading_cycle`
          );
        const readInCycle = sumRes.recordset && sumRes.recordset[0] ? parseInt(sumRes.recordset[0].read_in_cycle, 10) : 0;
        const remaining = totalPages - readInCycle;
        if (pagesRead > remaining) {
          await transaction.rollback();
          throw new Error("pagesRead exceeds remaining pages in current cycle");
        }
      }

      // Insert reading session
      const sessionId = await this.sessionRepo.addReadingSession(bookId, pagesRead, occurredAt ?? null, currentCycle, transaction);

      // After insertion, if totalPages defined and reached, set status to COMPLETED and log history
      if (totalPages !== null) {
        const totalRes = await req.input("book_id_total", bookId).query(
          `SELECT ISNULL(SUM(pages_read),0) AS total_read FROM ReadingSessions WHERE book_id = @book_id_total`
        );
        const totalRead = totalRes.recordset && totalRes.recordset[0] ? parseInt(totalRes.recordset[0].total_read, 10) : 0;
        if (totalRead >= totalPages) {
          // Update status to COMPLETED
          await this.bookRepo.updateStatus(bookId, COMPLETED, transaction);
          await req
            .input("book_id_hist2", bookId)
            .input("old_status2", READING)
            .input("new_status2", COMPLETED)
            .query(`INSERT INTO BookStatusHistory (book_id, old_status_id, new_status_id, changed_at) VALUES (@book_id_hist2, @old_status2, @new_status2, GETDATE())`);
        }
      }

      await transaction.commit();
      return { sessionId };
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

export default AddReadingSessionUseCase;
