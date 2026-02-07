/**
 * CreateBookService (Command Use Case)
 * Creates a new book with automatic author and country creation
 * 
 * Responsibilities:
 * - Implement CreateBook use case
 * - Orchestrate repositories within a transaction
 * - Ensure author and country exist (create if needed)
 * 
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - Transactional (mutates: Books, Authors, Countries, BookStatusHistory)
 * - Returns Book entity
 */

import sql from "mssql";
import { ConflictError } from "../errors/index.js";
import { BookStatus } from "../models/BookStatus.js";

export class CreateBookService {
  constructor(
    mssqlClient,
    bookRepository,
    authorRepository,
    countryRepository,
    bookStatusHistoryRepository
  ) {
    this.mssqlClient = mssqlClient;
    this.bookRepository = bookRepository;
    this.authorRepository = authorRepository;
    this.countryRepository = countryRepository;
    this.bookStatusHistoryRepository = bookStatusHistoryRepository;
  }

  /**
   * Execute CreateBook use case
   * @param {Object} input - { title, isbn, totalPages, author: { name, nationality } }
   * @returns {Promise<Book>}
   */
  async execute(input) {
    const { title, isbn, totalPages, author } = input;

    // Step 1: Check if ISBN already exists (outside transaction)
    if (isbn) {
      const existingBook = await this.bookRepository.findByIsbn(isbn);
      if (existingBook) {
        throw new ConflictError(`Book with ISBN ${isbn} already exists`, "ISBN");
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
    const pool = await this.mssqlClient.getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Create country if needed
      if (needsCountryCreation) {
        const country = await this.countryRepository.create(
          { name: author.nationality },
          transaction
        );
        countryId = country.id;
      }

      // Create author if needed
      if (needsAuthorCreation) {
        authorRecord = await this.authorRepository.create(
          { name: author.name, nationalityId: countryId },
          transaction
        );
      }

      // Step 5: Get WISH_LIST status ID
      const request = new sql.Request(transaction);
      const statusResult = await request
        .input("statusCode", sql.NVarChar, BookStatus.WISH_LIST)
        .query(`
          SELECT id FROM BookStatuses WHERE internal_code = @statusCode
        `);
      const wishListStatusId = statusResult.recordset[0].id;

      // Step 6: Create book
      const book = await this.bookRepository.create(
        {
          title,
          isbn,
          authorId: authorRecord.id,
          totalPages,
          statusId: wishListStatusId
        },
        transaction
      );

      // Step 7: Create BookStatusHistory entry (NULL → WISH_LIST)
      await this.bookStatusHistoryRepository.create(
        {
          bookId: book.id,
          oldStatus: null,
          newStatus: BookStatus.WISH_LIST,
          readingCycle: 1
        },
        transaction
      );

      await transaction.commit();

      return book;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
