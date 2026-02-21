/**
 * Book Domain Entity Test Suite
 * Tests for Book domain model and FSM behavior
 *
 * Pattern: AAA (Arrange-Act-Assert)
 * Focus: Invariants, state transitions, business logic
 */

import { describe, it, expect } from "vitest";
import { Book } from "../models/Book.js";
import { BookStatus } from "../models/BookStatus.js";
import { BookClosedError } from "../errors/domain/BookClosedError.js";

describe("Book Domain Entity", () => {
  describe("Factory Methods", () => {
    it("should create Book from database record", () => {
      // Arrange
      const dbRecord = {
        id: 1,
        title: "Clean Architecture",
        isbn: "9780134494166",
        author_id: 1,
        author_name: "Robert C. Martin",
        author_nationality: "United States",
        total_pages: 432,
        status_code: BookStatus.READING,
        current_reading_cycle: 1,
        score: null,
        comment: null,
      };

      // Act
      const book = Book.fromDatabase(dbRecord);

      // Assert
      expect(book).toBeInstanceOf(Book);
      expect(book.id).toBe(1);
      expect(book.title).toBe("Clean Architecture");
      expect(book.isbn).toBe("9780134494166");
      expect(book.authorId).toBe(1);
      expect(book.authorName).toBe("Robert C. Martin");
      expect(book.authorNationality).toBe("United States");
      expect(book.totalPages).toBe(432);
      expect(book.status).toBe(BookStatus.READING);
      expect(book.currentReadingCycle).toBe(1);
    });

    it("should handle database record with score and comment", () => {
      // Arrange
      const dbRecord = {
        id: 2,
        title: "Domain-Driven Design",
        isbn: "9780321125217",
        author_id: 2,
        author_name: "Eric Evans",
        author_nationality: "United States",
        total_pages: 560,
        status_code: BookStatus.COMPLETED,
        current_reading_cycle: 1,
        score: 5,
        comment: "Essential reading for software architects",
      };

      // Act
      const book = Book.fromDatabase(dbRecord);

      // Assert
      expect(book.score).toBe(5);
      expect(book.comment).toBe("Essential reading for software architects");
    });
  });

  describe("JSON Serialization", () => {
    it("should convert Book to JSON representation", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Clean Code",
        isbn: "9780132350884",
        authorId: 1,
        authorName: "Robert C. Martin",
        authorNationality: "United States",
        totalPages: 464,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act
      const json = book.toJSON();

      // Assert
      expect(json).toEqual({
        id: 1,
        title: "Clean Code",
        isbn: "9780132350884",
        author: {
          id: 1,
          name: "Robert C. Martin",
          nationality: "United States",
        },
        totalPages: 464,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });
    });
  });

  describe("Business Logic - isReadable()", () => {
    it("should return true when book status is READING", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act
      const result = book.isReadable();

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when book status is WISH_LIST", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act
      const result = book.isReadable();

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when book status is COMPLETED", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.COMPLETED,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act
      const result = book.isReadable();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Business Logic - isClosed()", () => {
    it("should return true when book status is COMPLETED", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.COMPLETED,
        currentReadingCycle: 1,
        score: 5,
        comment: "Great book!",
      });

      // Act
      const result = book.isClosed();

      // Assert
      expect(result).toBe(true);
    });

    it("should return true when book status is ABANDONED", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.ABANDONED,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act
      const result = book.isClosed();

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when book status is READING", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act
      const result = book.isClosed();

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when book status is WISH_LIST", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act
      const result = book.isClosed();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Business Logic - ensureCanAcceptSession()", () => {
    it("should not throw error when book status is WISH_LIST", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act & Assert
      expect(() => book.ensureCanAcceptSession()).not.toThrow();
    });

    it("should not throw error when book status is READING", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act & Assert
      expect(() => book.ensureCanAcceptSession()).not.toThrow();
    });

    it("should not throw error when book status is COMPLETED", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.COMPLETED,
        currentReadingCycle: 1,
        score: 5,
        comment: "Done!",
      });

      // Act & Assert
      expect(() => book.ensureCanAcceptSession()).not.toThrow();
    });

    it("should throw BookClosedError when book status is ABANDONED", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.ABANDONED,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act & Assert
      expect(() => book.ensureCanAcceptSession()).toThrow(BookClosedError);
    });
  });

  describe("FSM - calculateTransition()", () => {
    describe("Transition 1: WISH_LIST → READING", () => {
      it("should transition from WISH_LIST to READING when logging first pages", () => {
        // Arrange
        const book = new Book({
          id: 1,
          title: "Test Book",
          isbn: "1234567890123",
          authorId: 1,
          authorName: "Test Author",
          authorNationality: "Test Country",
          totalPages: 200,
          status: BookStatus.WISH_LIST,
          currentReadingCycle: 1,
          score: null,
          comment: null,
        });

        // Act
        const transition = book.calculateTransition(0, 50);

        // Assert
        expect(transition).toEqual({
          oldStatus: BookStatus.WISH_LIST,
          newStatus: BookStatus.READING,
          newCycle: 1,
          shouldTransition: true,
        });
      });

      it("should transition even with 1 page read", () => {
        // Arrange
        const book = new Book({
          id: 1,
          title: "Test Book",
          isbn: "1234567890123",
          authorId: 1,
          authorName: "Test Author",
          authorNationality: "Test Country",
          totalPages: 200,
          status: BookStatus.WISH_LIST,
          currentReadingCycle: 1,
          score: null,
          comment: null,
        });

        // Act
        const transition = book.calculateTransition(0, 1);

        // Assert
        expect(transition.newStatus).toBe(BookStatus.READING);
        expect(transition.shouldTransition).toBe(true);
      });
    });

    describe("Transition 2: COMPLETED → READING (re-read cycle)", () => {
      it("should transition from COMPLETED to READING and increment cycle", () => {
        // Arrange
        const book = new Book({
          id: 1,
          title: "Test Book",
          isbn: "1234567890123",
          authorId: 1,
          authorName: "Test Author",
          authorNationality: "Test Country",
          totalPages: 200,
          status: BookStatus.COMPLETED,
          currentReadingCycle: 1,
          score: 5,
          comment: "Great!",
        });

        // Act
        const transition = book.calculateTransition(0, 25);

        // Assert
        expect(transition).toEqual({
          oldStatus: BookStatus.COMPLETED,
          newStatus: BookStatus.READING,
          newCycle: 2,
          shouldTransition: true,
        });
      });

      it("should increment cycle from 2 to 3 on third read", () => {
        // Arrange
        const book = new Book({
          id: 1,
          title: "Test Book",
          isbn: "1234567890123",
          authorId: 1,
          authorName: "Test Author",
          authorNationality: "Test Country",
          totalPages: 200,
          status: BookStatus.COMPLETED,
          currentReadingCycle: 2,
          score: 5,
          comment: "Still great!",
        });

        // Act
        const transition = book.calculateTransition(0, 30);

        // Assert
        expect(transition.newCycle).toBe(3);
        expect(transition.shouldTransition).toBe(true);
      });
    });

    describe("Transition 3: READING → COMPLETED (auto-completion)", () => {
      it("should transition to COMPLETED when total pages read equals total pages", () => {
        // Arrange
        const book = new Book({
          id: 1,
          title: "Test Book",
          isbn: "1234567890123",
          authorId: 1,
          authorName: "Test Author",
          authorNationality: "Test Country",
          totalPages: 200,
          status: BookStatus.READING,
          currentReadingCycle: 1,
          score: null,
          comment: null,
        });

        // Act - Reading last 50 pages (already read 150)
        const transition = book.calculateTransition(150, 50);

        // Assert
        expect(transition).toEqual({
          oldStatus: BookStatus.READING,
          newStatus: BookStatus.PENDING_SCORE,
          newCycle: 1,
          shouldTransition: true,
        });
      });

      it("should transition to PENDING_SCORE when total pages read exceeds total pages", () => {
        // Arrange
        const book = new Book({
          id: 1,
          title: "Test Book",
          isbn: "1234567890123",
          authorId: 1,
          authorName: "Test Author",
          authorNationality: "Test Country",
          totalPages: 200,
          status: BookStatus.READING,
          currentReadingCycle: 1,
          score: null,
          comment: null,
        });

        // Act - Over-reading (edge case that shouldn't happen due to validation)
        const transition = book.calculateTransition(150, 100);

        // Assert
        expect(transition.newStatus).toBe(BookStatus.PENDING_SCORE);
        expect(transition.shouldTransition).toBe(true);
      });

      it("should not transition when total pages not yet reached", () => {
        // Arrange
        const book = new Book({
          id: 1,
          title: "Test Book",
          isbn: "1234567890123",
          authorId: 1,
          authorName: "Test Author",
          authorNationality: "Test Country",
          totalPages: 200,
          status: BookStatus.READING,
          currentReadingCycle: 1,
          score: null,
          comment: null,
        });

        // Act
        const transition = book.calculateTransition(150, 49); // 199 total, not 200

        // Assert
        expect(transition).toEqual({
          oldStatus: BookStatus.READING,
          newStatus: BookStatus.READING,
          newCycle: 1,
          shouldTransition: false,
        });
      });
    });

    describe("Combined Transitions", () => {
      it("should transition WISH_LIST → READING when completing book in one session", () => {
        // Arrange - Very short book
        const book = new Book({
          id: 1,
          title: "Short Story",
          isbn: "1234567890123",
          authorId: 1,
          authorName: "Test Author",
          authorNationality: "Test Country",
          totalPages: 50,
          status: BookStatus.WISH_LIST,
          currentReadingCycle: 1,
          score: null,
          comment: null,
        });

        // Act - Read entire book in one session
        const transition = book.calculateTransition(0, 50);

        // Assert - Transition evaluates one step at a time
        // WISH_LIST → READING happens first, then service detects completion
        expect(transition).toEqual({
          oldStatus: BookStatus.WISH_LIST,
          newStatus: BookStatus.READING,
          newCycle: 1,
          shouldTransition: true,
        });
      });

      it("should transition COMPLETED → READING when starting re-read", () => {
        // Arrange
        const book = new Book({
          id: 1,
          title: "Short Story",
          isbn: "1234567890123",
          authorId: 1,
          authorName: "Test Author",
          authorNationality: "Test Country",
          totalPages: 50,
          status: BookStatus.COMPLETED,
          currentReadingCycle: 1,
          score: 5,
          comment: "Loved it!",
        });

        // Act - Re-read entire book in one session
        const transition = book.calculateTransition(0, 50);

        // Assert - Transition evaluates one step at a time
        // COMPLETED → READING happens, cycle increments
        expect(transition).toEqual({
          oldStatus: BookStatus.COMPLETED,
          newStatus: BookStatus.READING,
          newCycle: 2, // Cycle incremented
          shouldTransition: true,
        });
      });
    });

    describe("No Transition Cases", () => {
      it("should not transition when READING and not finished", () => {
        // Arrange
        const book = new Book({
          id: 1,
          title: "Test Book",
          isbn: "1234567890123",
          authorId: 1,
          authorName: "Test Author",
          authorNationality: "Test Country",
          totalPages: 400,
          status: BookStatus.READING,
          currentReadingCycle: 1,
          score: null,
          comment: null,
        });

        // Act
        const transition = book.calculateTransition(100, 50); // 150 out of 400

        // Assert
        expect(transition.shouldTransition).toBe(false);
        expect(transition.oldStatus).toBe(BookStatus.READING);
        expect(transition.newStatus).toBe(BookStatus.READING);
      });
    });
  });

  describe("Business Logic - canAcceptPages()", () => {
    it("should return true when pages to read do not exceed total pages", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act
      const result = book.canAcceptPages(150, 50); // Exactly 200

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when pages to read exceed total pages", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act
      const result = book.canAcceptPages(150, 51); // 201 total

      // Assert
      expect(result).toBe(false);
    });

    it("should return true when reading first pages from zero", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Test Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 200,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act
      const result = book.canAcceptPages(0, 50);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when attempting to read more than total pages from start", () => {
      // Arrange
      const book = new Book({
        id: 1,
        title: "Short Book",
        isbn: "1234567890123",
        authorId: 1,
        authorName: "Test Author",
        authorNationality: "Test Country",
        totalPages: 50,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      // Act
      const result = book.canAcceptPages(0, 51);

      // Assert
      expect(result).toBe(false);
    });
  });
});
