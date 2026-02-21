/**
 * Book Domain Entity
 * Represents a book in the system with its status and reading cycles
 *
 * This entity enforces domain invariants and owns business behavior
 * Rich entity: encapsulates state transition logic
 */

import { BookStatus } from "@reading-vault/common";
import {
  BookClosedError,
  BookPendingReviewError,
  InvalidStateTransitionError,
  MissingScoreError,
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
    comment,
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
      comment: record.comment,
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
        nationality: this.authorNationality,
      },
      totalPages: this.totalPages,
      status: this.status,
      currentReadingCycle: this.currentReadingCycle,
      score: this.score,
      comment: this.comment,
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
    return (
      this.status === BookStatus.COMPLETED ||
      this.status === BookStatus.ABANDONED
    );
  }

  /**
   * Check if book can accept new reading sessions
   * Guard clause for ABANDONED and PENDING_SCORE status
   * @throws {BookClosedError} if book is ABANDONED
   * @throws {BookPendingReviewError} if book is PENDING_SCORE
   */
  ensureCanAcceptSession() {
    if (this.status === BookStatus.ABANDONED) {
      throw new BookClosedError(this.id, this.status);
    }
    if (this.status === BookStatus.PENDING_SCORE) {
      throw new BookPendingReviewError(this.id);
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

    // Transition 3: READING → PENDING_SCORE (auto-completion, requires user review)
    if (
      this.status === BookStatus.READING &&
      this.totalPages !== null &&
      totalPagesAfterSession >= this.totalPages
    ) {
      newStatus = BookStatus.PENDING_SCORE;
    }

    return {
      oldStatus: this.status,
      newStatus,
      newCycle,
      shouldTransition: this.status !== newStatus,
    };
  }

  /**
   * Validate that pages_read doesn't exceed remaining pages
   * @param {number} currentPagesInCycle - Pages already read in current cycle
   * @param {number} pagesRead - Pages to be logged
   * @returns {boolean}
   */
  canAcceptPages(currentPagesInCycle, pagesRead) {
    return currentPagesInCycle + pagesRead <= this.totalPages;
  }

  /**
   * Ensure book can be reviewed (marked as COMPLETED or ABANDONED with score)
   * Valid transition: PENDING_SCORE → COMPLETED/ABANDONED
   * @param {string} targetStatus - Target status (COMPLETED or ABANDONED)
   * @param {number|null} score - Score to be assigned
   * @throws {InvalidStateTransitionError} if current status is not PENDING_SCORE
   * @throws {MissingScoreError} if score is missing
   */
  ensureCanBeReviewed(targetStatus, score) {
    // Rule 1: Can only review from PENDING_SCORE status
    if (this.status !== BookStatus.PENDING_SCORE) {
      throw new InvalidStateTransitionError(
        this.id,
        this.status,
        targetStatus,
        "Book must be in PENDING_SCORE status to be reviewed.",
      );
    }

    // Rule 2: Target status must be COMPLETED or ABANDONED
    if (
      targetStatus !== BookStatus.COMPLETED &&
      targetStatus !== BookStatus.ABANDONED
    ) {
      throw new InvalidStateTransitionError(
        this.id,
        this.status,
        targetStatus,
        "Review can only transition to COMPLETED or ABANDONED.",
      );
    }

    // Rule 3: Score is mandatory
    if (score === null || score === undefined) {
      throw new MissingScoreError(this.id, targetStatus);
    }
  }

  /**
   * Ensure book can request review (manual transition to PENDING_SCORE)
   * Valid transition: READING → PENDING_SCORE (manual request)
   * Use case: User wants to abandon book without completing all pages
   * @throws {InvalidStateTransitionError} if current status is not READING
   */
  ensureCanRequestReview() {
    if (this.status !== BookStatus.READING) {
      throw new InvalidStateTransitionError(
        this.id,
        this.status,
        BookStatus.PENDING_SCORE,
        "Only READING books can request review.",
      );
    }
  }

  /**
   * Ensure book can be reopened
   * Valid transition: ABANDONED → READING
   * @throws {InvalidStateTransitionError} if current status is not ABANDONED
   */
  ensureCanBeReopened() {
    if (this.status !== BookStatus.ABANDONED) {
      throw new InvalidStateTransitionError(
        this.id,
        this.status,
        BookStatus.READING,
        "Only ABANDONED books can be reopened.",
      );
    }
  }
}
