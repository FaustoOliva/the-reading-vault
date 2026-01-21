import { IBookStatusHistoryRepository } from "../../domain/repositories/IBookStatusHistoryRepository";
import DatabaseConfig from "../database/DatabaseConfig";
import mssql from "mssql";

export class BookStatusHistoryRepositoryImpl implements IBookStatusHistoryRepository {
  async recordTransition(
    bookId: number,
    oldStatusId: number | null,
    newStatusId: number,
    readingCycle: number,
    reason: string,
    tx?: mssql.Transaction,
  ): Promise<number> {
    const request = tx
      ? tx.request()
      : (await DatabaseConfig.getPool()).request();

    const result = await request
      .input("book_id", bookId)
      .input("old_status_id", oldStatusId ?? null)
      .input("new_status_id", newStatusId)
      .input("reading_cycle", readingCycle)
      .query(
        `
        INSERT INTO BookStatusHistory (book_id, old_status_id, new_status_id, reading_cycle, changed_at)
        OUTPUT INSERTED.id
        VALUES (@book_id, @old_status_id, @new_status_id, @reading_cycle, GETDATE())
      `,
      );

    if (!result.recordset || result.recordset.length === 0) {
      throw new Error("Failed to record status transition");
    }

    return result.recordset[0].id;
  }
}

export default BookStatusHistoryRepositoryImpl;
