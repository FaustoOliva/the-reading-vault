import { Book } from "../../domain/entities/Book";
import { IBookRepository } from "../../domain/repositories/IBookRepository";
import { IAuthorRepository } from "../../domain/repositories/IAuthorRepository";
import { IBookStatusHistoryRepository } from "../../domain/repositories/IBookStatusHistoryRepository";
import { IReadingSessionRepository } from "../../domain/repositories/IReadingSessionRepository";
import { DuplicateISBNException } from "../../domain/exceptions/DuplicateISBNException";
import { ValidationException } from "../../domain/exceptions/ValidationException";
import DatabaseConfig from "../../infrastructure/database/DatabaseConfig";
import { CreateBookSchema, CreateBookInput } from "@trv/common";
import mssql from "mssql";

export interface CreateBookOutput {
  id: number;
  title: string;
  author_name: string;
  isbn: string | null;
  total_pages: number | null;
  status: string;
  current_reading_cycle: number;
  comment: string | null;
}

/**
 * CreateBook Use Case
 *
 * Implements POST /books business logic:
 * - Author deduplication (find or create)
 * - ISBN uniqueness validation
 * - Initial state assignment (WISH_LIST or READING)
 * - Status history logging
 *
 * Follows Clean Architecture: encapsulates all business rules,
 * coordinating between repositories without infrastructure coupling.
 */
export class CreateBookUseCase {
  constructor(
    private bookRepo: IBookRepository,
    private authorRepo: IAuthorRepository,
    private historyRepo: IBookStatusHistoryRepository,
    private sessionRepo: IReadingSessionRepository,
  ) {}

  async execute(input: CreateBookInput): Promise<CreateBookOutput> {
    // Validate input using Zod schema from @trv/common
    const validatedInput = CreateBookSchema.parse(input);

    const pool = await DatabaseConfig.getPool();
    const transaction = new mssql.Transaction(pool);

    try {
      await transaction.begin();

      // Step 1: ISBN Guard - Check for duplicate ISBN
      if (validatedInput.isbn) {
        const existingBook = await this.checkDuplicateISBN(
          validatedInput.isbn,
          transaction,
        );
        if (existingBook) {
          await transaction.rollback();
          throw new DuplicateISBNException(validatedInput.isbn);
        }
      }

      // Step 2: Author Deduplication - Find or create author
      const authorName = validatedInput.author_name?.trim() || "Unknown Author";
      const authorId = await this.findOrCreateAuthor(authorName, transaction);

      // Step 3: Determine initial status based on initial_session
      const statusId = validatedInput.initial_session ? 2 : 1; // 2=READING, 1=WISH_LIST
      const statusName = validatedInput.initial_session ? "READING" : "WISH_LIST";

      // Step 4: Create book entity
      const book = new Book({
        title: validatedInput.title.trim(),
        author_id: authorId,
        isbn: validatedInput.isbn?.trim() || null,
        total_pages: validatedInput.total_pages ?? null,
        status_id: statusId,
        comment: validatedInput.comment?.trim() || null,
        current_cycle: 1,
      });

      const bookId = (await this.bookRepo.save(book, transaction)) as number;

      // Step 5: Log initial status transition in history
      await this.historyRepo.recordTransition(
        bookId,
        null, // No old status for new books
        statusId,
        1, // Initial cycle is always 1
        "BOOK_CREATED",
        transaction,
      );

      // Step 6: If initial session provided, create reading session
      // and check for auto-completion
      if (validatedInput.initial_session) {
        const occurredAt = validatedInput.initial_session.occurred_at || new Date();
        
        await this.sessionRepo.addReadingSession(
          bookId,
          validatedInput.initial_session.pages_read,
          occurredAt,
          1, // Initial cycle
          transaction,
        );

        // Check for auto-completion on initial session
        if (validatedInput.total_pages != null && validatedInput.total_pages > 0) {
          const pagesReadInCycle = await this.bookRepo.getTotalPagesRead(
            bookId,
            1,
            transaction,
          );

          if (pagesReadInCycle >= validatedInput.total_pages) {
            // Auto-transition to COMPLETED
            await this.bookRepo.updateStatus(bookId, 3, transaction); // 3=COMPLETED
            
            // Record auto-completion transition
            await this.historyRepo.recordTransition(
              bookId,
              statusId,
              3, // COMPLETED
              1,
              "COMPLETED_AUTO_TRANSITION",
              transaction,
            );
          }
        }
      }

      await transaction.commit();

      return {
        id: bookId,
        title: book.title,
        author_name: authorName,
        isbn: book.isbn ?? null,
        total_pages: book.total_pages ?? null,
        status: statusName,
        current_reading_cycle: 1,
        comment: book.comment ?? null,
      };
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (_rollbackErr) {
        // Log rollback error but don't suppress original error
      }
      throw error;
    }
  }

  /**
   * Check if an ISBN already exists in the database.
   * Returns the existing book or null.
   */
  private async checkDuplicateISBN(
    isbn: string,
    tx: any,
  ): Promise<Book | null> {
    const result = await tx
      .request()
      .input("isbn", isbn)
      .query(`SELECT id FROM Books WHERE isbn = @isbn`);

    if (result.recordset && result.recordset.length > 0) {
      return new Book({ id: result.recordset[0].id, title: "" }); // Minimal book for check
    }
    return null;
  }

  /**
   * Find existing author by name or create a new one.
   * Returns author ID.
   */
  private async findOrCreateAuthor(name: string, tx: any): Promise<number> {
    // Try to find existing author
    const result = await tx
      .request()
      .input("name", name)
      .query(`SELECT id FROM Authors WHERE name = @name`);

    if (result.recordset && result.recordset.length > 0) {
      return result.recordset[0].id;
    }

    // Create new author
    const insertResult = await tx
      .request()
      .input("name", name)
      .query(`INSERT INTO Authors (name) OUTPUT INSERTED.id VALUES (@name)`);

    if (!insertResult.recordset || insertResult.recordset.length === 0) {
      throw new Error("Failed to create author");
    }

    return insertResult.recordset[0].id;
  }
}

export default CreateBookUseCase;
