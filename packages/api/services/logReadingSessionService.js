/**
 * LogReadingSessionService (Command Use Case)
 * Logs a reading session for a book with automatic state transitions
 *
 * Responsibilities:
 * - Implement LogReadingSession use case as defined in USE_CASES.md
 * - Orchestrate repositories within a transaction
 * - Delegate domain decisions to Book entity
 *
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - No domain logic (delegated to Book entity)
 * - Transactional (mutates: ReadingSessions, Books, BookStatusHistory)
 * - Returns ReadingSession entity
 */

import { NotFoundError, BadRequestError } from "../errors/index.js";

export class LogReadingSessionService {
  constructor(
    pgClient,
    bookRepository,
    readingSessionRepository,
    bookStatusHistoryRepository,
  ) {
    this.pgClient = pgClient;
    this.bookRepository = bookRepository;
    this.readingSessionRepository = readingSessionRepository;
    this.bookStatusHistoryRepository = bookStatusHistoryRepository;
  }

  /**
   * Execute LogReadingSession use case
   * @param {Object} input - { bookId, pagesRead, occurredAt }
   * @returns {Promise<ReadingSession>}
   */
  async execute(input) {
    const { bookId, pagesRead, occurredAt } = input;

    // Step 1: Load book (outside transaction)
    const book = await this.bookRepository.getById(bookId);

    if (!book) {
      throw new NotFoundError("Book", bookId);
    }

    // Step 2: Guard Clause - Delegate to Book entity
    book.ensureCanAcceptSession();

    // Step 3: Get current pages in cycle (outside transaction)
    const currentPagesInCycle =
      await this.readingSessionRepository.getTotalPagesInCycle(
        bookId,
        book.currentReadingCycle,
      );

    // Step 4: Validate pages constraint - Delegate to Book entity
    if (!book.canAcceptPages(currentPagesInCycle, pagesRead)) {
      throw new BadRequestError(
        `Pages read (${pagesRead}) would exceed total pages. Current: ${currentPagesInCycle}, Total: ${book.totalPages}`,
        "PagesValidation",
      );
    }

    // Step 5: Calculate transition - Delegate to Book entity
    const transition = book.calculateTransition(currentPagesInCycle, pagesRead);

    // Step 6: Begin transaction for writes only
    const client = await this.pgClient.beginTransaction();

    try {
      // 6.1 Insert ReadingSession
      const session = await this.readingSessionRepository.create(
        {
          bookId,
          pagesRead,
          readingCycle: transition.newCycle,
          occurredAt: occurredAt || new Date(),
        },
        client,
      );

      // 6.2 Update Book if status changed
      if (transition.shouldTransition) {
        await this.bookRepository.updateStatus(
          bookId,
          transition.newStatus,
          transition.newCycle,
          client,
        );

        // 6.3 Insert BookStatusHistory
        await this.bookStatusHistoryRepository.create(
          {
            bookId,
            oldStatus: transition.oldStatus,
            newStatus: transition.newStatus,
            readingCycle: transition.newCycle,
          },
          client,
        );
      }

      await client.query("COMMIT");

      return session;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
