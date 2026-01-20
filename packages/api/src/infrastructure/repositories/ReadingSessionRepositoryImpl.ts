import DatabaseConfig from "../database/DatabaseConfig";
import IReadingSessionRepository from "../../domain/repositories/IReadingSessionRepository";
import mssql from "mssql";

export class ReadingSessionRepositoryImpl implements IReadingSessionRepository {
  async addReadingSession(
    bookId: number,
    pagesRead: number,
    occurredAt: Date | null,
    readingCycle: number,
    tx?: any
  ): Promise<number> {
    const useRequest =
      tx && typeof tx.request === "function"
        ? tx.request()
        : (await DatabaseConfig.getPool()).request();

    const sessionDate = occurredAt ?? new Date();

    const insertResult = await useRequest
      .input("book_id", bookId)
      .input("pages_read", pagesRead)
      .input("occurred_at", sessionDate)
      .input("reading_cycle", readingCycle)
      .query(
        `INSERT INTO ReadingSessions (book_id, pages_read, occurred_at, reading_cycle, created_at)
         OUTPUT INSERTED.id
         VALUES (@book_id, @pages_read, @occurred_at, @reading_cycle, GETDATE())`
      );

    const sessionId =
      insertResult.recordset && insertResult.recordset[0]
        ? insertResult.recordset[0].id
        : 0;
    return sessionId;
  }
}

export default ReadingSessionRepositoryImpl;
