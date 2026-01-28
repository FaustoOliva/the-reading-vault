/**
 * Book Domain Entity
 * Represents a book in the system with its status and reading cycles
 * 
 * This entity enforces domain invariants and owns business behavior
 */

import { BookStatus } from "./BookStatus.js";

export class Book {
  constructor({
    id,
    title,
    isbn,
    authorId,
    authorName,
    totalPages,
    status,
    currentReadingCycle,
    score,
    comment
  }) {
    this.id = id;
    this.title = title;
    this.isbn = isbn;
    this.authorId = authorId;
    this.authorName = authorName;
    this.totalPages = totalPages;
    this.status = status;
    this.currentReadingCycle = currentReadingCycle;
    this.score = score;
    this.comment = comment;
  }

  /**
   * Factory method to create Book from database record
   */
  static fromDatabase(record) {
    return new Book({
      id: record.id,
      title: record.title,
      isbn: record.isbn,
      authorId: record.author_id,
      authorName: record.author_name,
      totalPages: record.total_pages,
      status: record.status_code,
      currentReadingCycle: record.current_reading_cycle,
      score: record.score,
      comment: record.comment
    });
  }

  /**
   * Convert to JSON representation for API responses
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      isbn: this.isbn,
      author: {
        id: this.authorId,
        name: this.authorName
      },
      totalPages: this.totalPages,
      status: this.status,
      currentReadingCycle: this.currentReadingCycle,
      score: this.score,
      comment: this.comment
    };
  }

  /**
   * Check if book is in a readable state
   */
  isReadable() {
    return this.status === BookStatus.READING;
  }

  /**
   * Check if book is closed (completed or abandoned)
   */
  isClosed() {
    return this.status === BookStatus.COMPLETED || this.status === BookStatus.ABANDONED;
  }
}
