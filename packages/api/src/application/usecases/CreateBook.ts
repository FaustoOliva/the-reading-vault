import { Book } from "../../domain/entities/Book";
import { IBookRepository } from "../../domain/repositories/IBookRepository";
import { IAuthorRepository } from "../../domain/repositories/IAuthorRepository";
import { IBookStatusHistoryRepository } from "../../domain/repositories/IBookStatusHistoryRepository";
import { IReadingSessionRepository } from "../../domain/repositories/IReadingSessionRepository";
import { DuplicateISBNException } from "../../domain/exceptions/DuplicateISBNException";
import { Author } from "../../domain/entities/Author";
import DatabaseConfig from "../../infrastructure/database/DatabaseConfig";

export interface CreateBookInput {
  title: string;
  author_name?: string | null;
  isbn?: string | null;
  total_pages?: number | null;
  comment?: string | null;
  // Optional: if provided, book starts in READING status with a session
  initial_session?: {
    pages_read: number;
    occurred_at?: Date;
  };
}

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
    private sessionRepo: IReadingSessionRepository
  ) {}

  async execute(input: CreateBookInput): Promise<CreateBookOutput> {
    const pool = await DatabaseConfig.getPool();
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      // 1. ISBN Guard: Check for duplicate ISBN
      if (input.isbn) {
        const existingBook = await this.checkDuplicateISBN(input.isbn, transaction);
        if (existingBook) {
          throw new DuplicateISBNException(input.isbn);
        }
      }

      // 2. Author Deduplication: Find or create author
      const authorName = input.author_name?.trim() || "Unknown Author";
      const authorId = await this.findOrCreateAuthor(authorName, transaction);

      // 3. Determine initial status
      const statusId = input.initial_session ? 2 : 1; // 2=READING, 1=WISH_LIST
      const statusName = input.initial_session ? "Reading" : "Wish List";

      // 4. Create book
      const book = new Book({
        title: input.title.trim(),
        author_id: authorId,
        isbn: input.isbn?.trim() || null,
        total_pages: input.total_pages ?? null,
        status_id: statusId,
        comment: input.comment?.trim() || null,
        current_cycle: 1,
      });

      const bookId = await this.bookRepo.save(book) as number;

      // 5. Log initial status in history
      await this.historyRepo.recordTransition(
        bookId,
        null, // No old status for new books
        statusId,
        1, // Initial cycle
        "BOOK_CREATED",
        transaction
      );

      // 6. If initial session provided, create it
      if (input.initial_session) {
        await this.sessionRepo.addReadingSession(
          bookId,
          input.initial_session.pages_read,
          input.initial_session.occurred_at || new Date(),
          1, // Initial cycle
          transaction
        );
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
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Check if an ISBN already exists in the database.
   * Returns the existing book or null.
   */
  private async checkDuplicateISBN(isbn: string, tx: any): Promise<Book | null> {
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
