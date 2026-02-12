/**
 * Book Domain Entity
 * Represents a book in the system with its status and reading cycles
 * 
 * This entity enforces domain invariants and owns business behavior
 * Rich entity: encapsulates state transition logic
 */

import { BookStatus } from "./BookStatus.js";
import {
  BookClosedError,
  InvalidStateTransitionError,
  MissingScoreError,
  InsufficientPagesError,
} from "../errors/index.js";

export class Book {
  constructor({
    id,
    title,
    isbn,
    authorId,
    authorName,
    authorNationality,
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
    this.authorNationality = authorNationality;
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
      authorNationality: record.author_nationality,
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
        name: this.authorName,
        nationality: this.authorNationality
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

  /**
   * Check if book can accept new reading sessions
   * Guard clause for ABANDONED status
   * @throws {BookClosedError} if book is ABANDONED
   */
  ensureCanAcceptSession() {
    if (this.status === BookStatus.ABANDONED) {
      throw new BookClosedError(this.id, this.status);
    }
  }

  /**
   * Calculate what the new status should be after logging pages
   * Encapsulates smart transition logic from DOMAIN.md section 3.3
   * 
   * @param {number} currentPagesInCycle - Pages already read in current cycle
   * @param {number} pagesRead - Pages about to be logged
   * @returns {Object} { newStatus, newCycle, shouldTransition }
   */
  calculateTransition(currentPagesInCycle, pagesRead) {
    let newStatus = this.status;
    let newCycle = this.currentReadingCycle;
    const totalPagesAfterSession = currentPagesInCycle + pagesRead;

    // Transition 1: WISH_LIST → READING
    if (this.status === BookStatus.WISH_LIST) {
      newStatus = BookStatus.READING;
    }

    // Transition 2: COMPLETED → READING (increment cycle)
    if (this.status === BookStatus.COMPLETED) {
      newStatus = BookStatus.READING;
      newCycle = this.currentReadingCycle + 1;
    }

    // Transition 3: READING → COMPLETED (auto-completion)
    if (this.status === BookStatus.READING && totalPagesAfterSession >= this.totalPages) {
      newStatus = BookStatus.COMPLETED;
    }

    return {
      oldStatus: this.status,
      newStatus,
      newCycle,
      shouldTransition: this.status !== newStatus
    };
  }

  /**
   * Validate that pages_read doesn't exceed remaining pages
   * @param {number} currentPagesInCycle - Pages already read in current cycle
   * @param {number} pagesRead - Pages to be logged
   * @returns {boolean}
   */
  canAcceptPages(currentPagesInCycle, pagesRead) {
    return (currentPagesInCycle + pagesRead) <= this.totalPages;
  }

  /**
   * Ensure book can be manually completed
   * Valid transitions: WISH_LIST → COMPLETED, READING → COMPLETED
   * @param {number|null} score - Score to be assigned
   * @param {number} pagesReadTotal - Total pages read across all cycles
   * @throws {InvalidStateTransitionError} if current status is COMPLETED or ABANDONED
   * @throws {MissingScoreError} if score is missing
   * @throws {InsufficientPagesError} if total_pages defined and not all pages read
   */
  ensureCanBeCompleted(score, pagesReadTotal) {
    // Rule 1: Cannot re-complete a COMPLETED book
    if (this.status === BookStatus.COMPLETED) {
      throw new InvalidStateTransitionError(
        this.id,
        this.status,
        BookStatus.COMPLETED,
        "Book is already completed. To update score/comment, use update endpoint."
      );
    }

    // Rule 2: Cannot complete an ABANDONED book directly
    if (this.status === BookStatus.ABANDONED) {
      throw new InvalidStateTransitionError(
        this.id,
        this.status,
        BookStatus.COMPLETED,
        "Cannot complete an abandoned book directly."
      );
    }

    // Rule 3: Score is mandatory
    if (score === null || score === undefined) {
      throw new MissingScoreError(this.id, BookStatus.COMPLETED);
    }

    // Rule 4: If total_pages is defined, all pages must be read
    if (this.totalPages !== null && pagesReadTotal < this.totalPages) {
      throw new InsufficientPagesError(this.id, pagesReadTotal, this.totalPages);
    }
  }

  /**
   * Ensure book can be abandoned
   * Valid transitions: WISH_LIST → ABANDONED, READING → ABANDONED
   * @param {number|null} score - Score to be assigned
   * @throws {InvalidStateTransitionError} if current status is COMPLETED or ABANDONED
   * @throws {MissingScoreError} if score is missing
   */
  ensureCanBeAbandoned(score) {
    // Rule 1: Cannot abandon an already ABANDONED book
    if (this.status === BookStatus.ABANDONED) {
      throw new InvalidStateTransitionError(
        this.id,
        this.status,
        BookStatus.ABANDONED,
        "Book is already abandoned."
      );
    }

    // Rule 2: Cannot abandon a COMPLETED book
    if (this.status === BookStatus.COMPLETED) {
      throw new InvalidStateTransitionError(
        this.id,
        this.status,
        BookStatus.ABANDONED,
        "Cannot abandon a completed book."
      );
    }

    // Rule 3: Score is mandatory
    if (score === null || score === undefined) {
      throw new MissingScoreError(this.id, BookStatus.ABANDONED);
    }
  }
}
