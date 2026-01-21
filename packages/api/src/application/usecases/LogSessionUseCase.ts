import { IBookRepository } from "../../domain/repositories/IBookRepository";
import IReadingSessionRepository from "../../domain/repositories/IReadingSessionRepository";
import { IBookStatusHistoryRepository } from "../../domain/repositories/IBookStatusHistoryRepository";
import DatabaseConfig from "../../infrastructure/database/DatabaseConfig";
import KPICalculator from "../utils/KPICalculator";
import {
  LogSessionInputSchema,
  LogSessionInput,
} from "../validators/LogSessionValidator";
import BookClosedException from "../../domain/exceptions/BookClosedException";
import BookNotFoundException from "../../domain/exceptions/BookNotFoundException";
import ValidationException from "../../domain/exceptions/ValidationException";
import mssql from "mssql";

/**
 * LogSessionUseCase - Implements the Log Reading Session Workflow
 *
 * Per BusinessRules.md Section 3, this use case handles:
 * 1. Input validation (Zod schema)
 * 2. Guard clause (ABANDONED status check)
 * 3. Smart transitions (WISH_LIST→READING, COMPLETED→READING with cycle++, auto-completion)
 * 4. KPI calculations (velocity, moving averages, completion estimates)
 * 5. Transactional persistence (all-or-nothing)
 *
 * Status IDs (from BookStatuses table):
 * - 1: WISH_LIST
 * - 2: READING
 * - 3: COMPLETED
 * - 4: ABANDONED
 */
export class LogSessionUseCase {
  private readonly STATUS_WISH_LIST = 1;
  private readonly STATUS_READING = 2;
  private readonly STATUS_COMPLETED = 3;
  private readonly STATUS_ABANDONED = 4;

  constructor(
    private bookRepo: IBookRepository,
    private sessionRepo: IReadingSessionRepository,
    private historyRepo: IBookStatusHistoryRepository,
  ) {}

  async execute(input: LogSessionInput): Promise<LogSessionResponse> {
    // Validate input using Zod schema
    const validatedInput = LogSessionInputSchema.parse(input);

    const pool = await DatabaseConfig.getPool();
    const transaction = new mssql.Transaction(pool);

    try {
      await transaction.begin();

      // Step 1: Fetch book and validate existence
      const book = await this.bookRepo.findById(validatedInput.book_id);
      if (!book) {
        await transaction.rollback();
        throw new BookNotFoundException(validatedInput.book_id);
      }

      // Step 2: Guard clause - Block ABANDONED books
      if (book.status_id === this.STATUS_ABANDONED) {
        await transaction.rollback();
        throw new BookClosedException(
          "This book is abandoned and locked. Manually reopen to continue.",
        );
      }

      // Step 3: Validate pages_read against remaining pages in current cycle
      if (book.total_pages != null && book.total_pages > 0) {
        const pagesInCycle = await this.bookRepo.getTotalPagesRead(
          book.id!,
          book.current_cycle ?? 1,
          transaction,
        );
        const remaining = book.total_pages - pagesInCycle;

        if (validatedInput.pages_read > remaining) {
          await transaction.rollback();
          throw new ValidationException(
            `Pages exceed remaining total. Remaining: ${remaining}, Requested: ${validatedInput.pages_read}`,
          );
        }
      }

      const currentCycle = book.current_cycle ?? 1;
      const occurredAt = validatedInput.occurred_at ?? new Date();

      // Step 4: Smart Transitions - before inserting session
      let newCycleAfterTransition = currentCycle;
      let statusAfterTransition = book.status_id!;
      let transitionData: {
        oldStatus: number;
        newStatus: number;
        reason: string;
      } | null = null;

      if (book.status_id === this.STATUS_WISH_LIST) {
        // WISH_LIST → READING transition
        await this.bookRepo.updateStatus(
          book.id!,
          this.STATUS_READING,
          transaction,
        );
        transitionData = {
          oldStatus: this.STATUS_WISH_LIST,
          newStatus: this.STATUS_READING,
          reason: "USER_LOG_SESSION",
        };
        statusAfterTransition = this.STATUS_READING;
      } else if (book.status_id === this.STATUS_COMPLETED) {
        // COMPLETED → READING transition with cycle increment
        newCycleAfterTransition = await this.bookRepo.incrementCurrentCycle(
          book.id!,
          transaction,
        );
        await this.bookRepo.updateStatus(
          book.id!,
          this.STATUS_READING,
          transaction,
        );
        transitionData = {
          oldStatus: this.STATUS_COMPLETED,
          newStatus: this.STATUS_READING,
          reason: "USER_LOG_SESSION",
        };
        statusAfterTransition = this.STATUS_READING;
      }

      // Record transition to history if it occurred
      if (transitionData) {
        await this.historyRepo.recordTransition(
          book.id!,
          transitionData.oldStatus,
          transitionData.newStatus,
          newCycleAfterTransition,
          transitionData.reason,
          transaction,
        );
      }

      // Step 5: Insert reading session - use the new cycle if it was incremented
      const sessionId = await this.sessionRepo.addReadingSession(
        book.id!,
        validatedInput.pages_read,
        occurredAt,
        newCycleAfterTransition,
        transaction,
      );

      // Step 6: Check for auto-completion
      let autoCompletionOccurred = false;
      if (book.total_pages != null && book.total_pages > 0) {
        const totalPagesRead = await this.bookRepo.getTotalPagesRead(
          book.id!,
          newCycleAfterTransition,
          transaction,
        );

        if (totalPagesRead >= book.total_pages) {
          // Auto-transition to COMPLETED
          await this.bookRepo.updateStatus(
            book.id!,
            this.STATUS_COMPLETED,
            transaction,
          );

          // Record the auto-completion transition
          await this.historyRepo.recordTransition(
            book.id!,
            statusAfterTransition,
            this.STATUS_COMPLETED,
            newCycleAfterTransition,
            "COMPLETED_AUTO_TRANSITION",
            transaction,
          );

          autoCompletionOccurred = true;
          statusAfterTransition = this.STATUS_COMPLETED;
        }
      }

      // Step 7: Commit transaction
      await transaction.commit();

      // Step 8: Calculate KPIs (outside transaction for read-only operations)
      const kpis = await this.calculateKPIs(
        book.id!,
        newCycleAfterTransition,
        book.total_pages ?? 0,
      );

      // Step 9: Build response
      const response: LogSessionResponse = {
        session_id: sessionId,
        book: {
          id: book.id!,
          title: book.title,
          status: this.getStatusCode(statusAfterTransition),
          current_reading_cycle: newCycleAfterTransition,
          pages_read_total: await this.bookRepo.getTotalPagesRead(
            book.id!,
            newCycleAfterTransition,
          ),
          total_pages: book.total_pages ?? 0,
        },
        kpi: kpis,
        transition_occurred: transitionData !== null || autoCompletionOccurred,
        status_change:
          transitionData !== null || autoCompletionOccurred
            ? {
                from: transitionData
                  ? this.getStatusCode(transitionData.oldStatus)
                  : this.getStatusCode(book.status_id!),
                to: this.getStatusCode(statusAfterTransition),
              }
            : null,
      };

      return response;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (_rollbackErr) {
        // Log rollback error but don't suppress original error
      }
      throw error;
    }
  }

  private async calculateKPIs(
    bookId: number,
    currentCycle: number,
    totalPages: number,
  ): Promise<KPIData> {
    const velocityCurrent = await KPICalculator.calculateCurrentCycleVelocity(
      bookId,
      currentCycle,
    );
    const velocity7d = await KPICalculator.calculate7DayVelocity(
      bookId,
      currentCycle,
    );
    const velocity30d = await KPICalculator.calculate30DayVelocity(
      bookId,
      currentCycle,
    );

    const pool = await DatabaseConfig.getPool();
    const result = await pool
      .request()
      .input("book_id", bookId)
      .input("reading_cycle", currentCycle)
      .query(
        `SELECT ISNULL(SUM(pages_read), 0) AS total_read 
         FROM ReadingSessions 
         WHERE book_id = @book_id AND reading_cycle = @reading_cycle`,
      );

    const pagesReadInCycle = result.recordset?.[0]?.total_read ?? 0;
    const remainingPages = totalPages - pagesReadInCycle;

    const estimatedCompletion = KPICalculator.calculateEstimatedCompletionDate(
      remainingPages,
      velocityCurrent,
    );

    const readingStreak = await KPICalculator.calculateReadingStreak(
      bookId,
      currentCycle,
    );

    const totalSessions = await KPICalculator.getTotalSessionsInCycle(
      bookId,
      currentCycle,
    );

    return {
      velocity_current_cycle: velocityCurrent,
      velocity_7d: velocity7d,
      velocity_30d: velocity30d,
      estimated_completion_date: estimatedCompletion,
      reading_streak: readingStreak,
      total_sessions_in_cycle: totalSessions,
    };
  }

  private getStatusCode(statusId: number): string {
    switch (statusId) {
      case this.STATUS_WISH_LIST:
        return "WISH_LIST";
      case this.STATUS_READING:
        return "READING";
      case this.STATUS_COMPLETED:
        return "COMPLETED";
      case this.STATUS_ABANDONED:
        return "ABANDONED";
      default:
        return "UNKNOWN";
    }
  }
}

export interface KPIData {
  velocity_current_cycle: number;
  velocity_7d: number;
  velocity_30d: number;
  estimated_completion_date: Date | null;
  reading_streak: number;
  total_sessions_in_cycle: number;
}

export interface BookData {
  id: number;
  title: string;
  status: string;
  current_reading_cycle: number;
  pages_read_total: number;
  total_pages: number;
}

export interface LogSessionResponse {
  session_id: number;
  book: BookData;
  kpi: KPIData;
  transition_occurred: boolean;
  status_change: {
    from: string | null;
    to: string;
  } | null;
}

export default LogSessionUseCase;
