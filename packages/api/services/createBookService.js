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

    const pool = await this.mssqlClient.getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Step 1: Check if ISBN already exists (if provided)
      if (isbn) {
        const existingBook = await this.bookRepository.findByIsbn(isbn, transaction);
        if (existingBook) {
          throw new ConflictError(`Book with ISBN ${isbn} already exists`, "ISBN");
        }
      }

      // Step 2: Get or create country (if nationality provided)
      let countryId = null;
      if (author.nationality) {
        let country = await this.countryRepository.findByName(author.nationality, transaction);
        if (!country) {
          country = await this.countryRepository.create(
            { name: author.nationality },
            transaction
          );
        }
        countryId = country.id;
      }

      // Step 3: Get or create author
      let authorRecord = await this.authorRepository.findByName(author.name, transaction);
      if (!authorRecord) {
        authorRecord = await this.authorRepository.create(
          { name: author.name, nationalityId: countryId },
          transaction
        );
      }

      // Step 4: Get WISH_LIST status ID
      const request = new sql.Request(transaction);
      const statusResult = await request
        .input("statusCode", sql.NVarChar, BookStatus.WISH_LIST)
        .query(`
          SELECT id FROM BookStatuses WHERE internal_code = @statusCode
        `);
      const wishListStatusId = statusResult.recordset[0].id;

      // Step 5: Create book
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

      // Step 6: Create BookStatusHistory entry (NULL → WISH_LIST)
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
