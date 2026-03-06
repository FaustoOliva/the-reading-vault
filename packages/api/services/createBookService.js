/**
 * CreateBookService (Command Use Case)
 * Creates a new book with automatic author and country creation
 *
 * Responsibilities:
 * - Implement CreateBook use case
 * - Orchestrate repositories within a transaction
 * - Ensure author and country exist (create if needed)
 * - Support legacy books with custom initial status
 *
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - Transactional (mutates: Books, Authors, Countries, BookStatusHistory)
 * - Returns Book entity
 * - Default status: WISH_LIST (if not provided)
 * - Supports all valid BookStatus values for legacy imports
 */

import { ConflictError } from "../errors/index.js";
import { BookStatus } from "@reading-vault/common";

export class CreateBookService {
  constructor(
    pgClient,
    bookRepository,
    authorRepository,
    countryRepository,
    bookStatusHistoryRepository,
  ) {
    this.pgClient = pgClient;
    this.bookRepository = bookRepository;
    this.authorRepository = authorRepository;
    this.countryRepository = countryRepository;
    this.bookStatusHistoryRepository = bookStatusHistoryRepository;
  }

  /**
   * Execute CreateBook use case
   * @param {Object} input - { title, isbn, totalPages, status, author: { name, nationality } }
   * @returns {Promise<Book>}
   */
  async execute(input) {
    const { title, isbn, totalPages, status, author } = input;

    // Step 1: Check if ISBN already exists (outside transaction)
    if (isbn) {
      const existingBook = await this.bookRepository.findByIsbn(isbn);
      if (existingBook) {
        throw new ConflictError(
          `Book with ISBN ${isbn} already exists`,
          "ISBN",
        );
      }
    }

    // Step 2: Get or create country (if nationality provided)
    let countryId = null;
    if (author.nationality) {
      let country = await this.countryRepository.findByName(author.nationality);
      if (!country) {
        // Will create within transaction
        countryId = null;
      } else {
        countryId = country.id;
      }
    }

    // Step 3: Get author (if exists)
    let authorRecord = await this.authorRepository.findByName(author.name);
    const needsAuthorCreation = !authorRecord;
    const needsCountryCreation = author.nationality && !countryId;

    // Step 4: Begin transaction for writes
    const client = await this.pgClient.beginTransaction();

    try {
      // Create country if needed
      if (needsCountryCreation) {
        const country = await this.countryRepository.create(
          { name: author.nationality },
          client,
        );
        countryId = country.id;
      }

      // Create author if needed
      if (needsAuthorCreation) {
        authorRecord = await this.authorRepository.create(
          { name: author.name, nationalityId: countryId },
          client,
        );
      }

      // Step 5: Determine target status (default to WISH_LIST if not provided)
      const targetStatus = status || BookStatus.WISH_LIST;

      // Get status ID for target status
      const statusResult = await client.query(
        `SELECT id FROM bookstatuses WHERE internal_code = $1`,
        [targetStatus]
      );
      const statusId = statusResult.rows[0].id;

      // Step 6: Create book
      const book = await this.bookRepository.create(
        {
          title,
          isbn,
          authorId: authorRecord.id,
          totalPages,
          statusId,
        },
        client,
      );

      // Step 7: Create BookStatusHistory entry (NULL → targetStatus)
      await this.bookStatusHistoryRepository.create(
        {
          bookId: book.id,
          oldStatus: null,
          newStatus: targetStatus,
          readingCycle: 1,
        },
        client,
      );

      await client.query("COMMIT");

      return book;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
