/**
 * GetRecentReadingSessionService (Query Use Case)
 * Retrieves the most recent reading session with book information
 *
 * Responsibilities:
 * - Fetch latest reading session from repository
 * - Return readable format for API response
 *
 * Rules:
 * - No business logic
 * - No validation (already validated by controller)
 * - Returns null if no session exists
 */

export class GetRecentReadingSessionService {
  constructor(readingSessionRepository) {
    this.readingSessionRepository = readingSessionRepository;
  }

  /**
   * Execute GetRecentReadingSession use case
   * @returns {Promise<Object|null>} Recent session with book info or null
   */
  async execute() {
    const data = await this.readingSessionRepository.getRecentWithBookInfo();

    if (!data) {
      return null;
    }

    return {
      id: data.session.id,
      bookId: data.session.bookId,
      readingCycle: data.session.readingCycle,
      pagesRead: data.session.pagesRead,
      occurredAt: data.session.occurredAt,
      createdAt: data.session.createdAt,
      book: {
        id: data.book.id,
        title: data.book.title,
        authorName: data.book.authorName,
      },
    };
  }
}
