/**
 * ReadingSession Domain Entity
 * Represents a single reading session logged by the user
 * 
 * This entity enforces domain invariants for reading session data
 */

export class ReadingSession {
  constructor({
    id,
    bookId,
    readingCycle,
    pagesRead,
    occurredAt,
    createdAt
  }) {
    this.id = id;
    this.bookId = bookId;
    this.readingCycle = readingCycle;
    this.pagesRead = pagesRead;
    this.occurredAt = occurredAt;
    this.createdAt = createdAt;
  }

  /**
   * Factory method to create ReadingSession from database record
   */
  static fromDatabase(record) {
    return new ReadingSession({
      id: record.id,
      bookId: record.book_id,
      readingCycle: record.reading_cycle,
      pagesRead: record.pages_read,
      occurredAt: record.occurred_at,
      createdAt: record.created_at
    });
  }

  /**
   * Convert to JSON representation for API responses
   */
  toJSON() {
    return {
      id: this.id,
      bookId: this.bookId,
      readingCycle: this.readingCycle,
      pagesRead: this.pagesRead,
      occurredAt: this.occurredAt,
      createdAt: this.createdAt
    };
  }
}
