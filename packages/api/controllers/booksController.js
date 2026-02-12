/**
 * BooksController
 * Handles HTTP requests for book-related operations
 * 
 * Responsibilities:
 * - Validate input using Zod
 * - Call services
 * - Format HTTP responses
 * - Forward errors to global middleware
 * 
 * Rules:
 * - No business logic
 * - Validation only happens here
 * - No domain error creation
 */

import { z } from "zod";
import { BookStatus } from "../models/BookStatus.js";

/**
 * Validation schema for GetBooks query parameters
 */
const getBooksQuerySchema = z.object({
  status: z.enum([
    BookStatus.WISH_LIST,
    BookStatus.READING,
    BookStatus.COMPLETED,
    BookStatus.ABANDONED
  ]).optional(),
  authorId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
}).strict();

/**
 * Validation schema for CreateBook request body
 */
const createBookBodySchema = z.object({
  title: z.string().min(1).max(255),
  isbn: z.string().max(20).optional(),
  totalPages: z.number().int().positive().optional(),
  status: z.enum([
    BookStatus.WISH_LIST,
    BookStatus.READING,
    BookStatus.COMPLETED,
    BookStatus.ABANDONED
  ]).optional(),
  author: z.object({
    name: z.string().min(1).max(255),
    nationality: z.string().max(40).optional()
  })
}).strict();

/**
 * Validation schema for CompleteBook request body
 */
const completeBookBodySchema = z.object({
  score: z.number().min(0).max(10),
  comment: z.string().optional()
}).strict();

/**
 * Validation schema for AbandonBook request body
 */
const abandonBookBodySchema = z.object({
  score: z.number().min(0).max(10),
  comment: z.string().optional()
}).strict();

export class BooksController {
  constructor(getBooksService, createBookService, getBookByIdService, completeBookService, abandonBookService) {
    this.getBooksService = getBooksService;
    this.createBookService = createBookService;
    this.getBookByIdService = getBookByIdService;
    this.completeBookService = completeBookService;
    this.abandonBookService = abandonBookService;
  }

  /**
   * GET /books
   * Returns all books with optional filters and pagination
   */
  async getBooks(req, res, next) {
    try {
      // Validate query parameters
      const validated = getBooksQuerySchema.parse(req.query);
      
      const { page, limit, ...filters } = validated;

      // Execute use case
      const result = await this.getBooksService.execute(filters, { page, limit });

      // Convert domain entities to JSON
      const booksJSON = result.books.map(book => book.toJSON());

      // Return paginated response
      res.status(200).json({
        success: true,
        data: booksJSON,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }

  /**
   * POST /books
   * Creates a new book
   */
  async createBook(req, res, next) {
    try {
      // Validate request body
      const validated = createBookBodySchema.parse(req.body);

      // Execute use case
      const book = await this.createBookService.execute(validated);

      // Return created book
      res.status(201).json({
        success: true,
        data: book.toJSON()
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }

  /**
   * GET /books/:id
   * Returns detailed information about a single book
   */
  async getBookById(req, res, next) {
    try {
      // Validate and parse book ID
      const bookId = z.coerce.number().int().positive().parse(req.params.id);

      // Execute use case
      const result = await this.getBookByIdService.execute(bookId);

      // Return book details
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);

  /**
   * PATCH /books/:id/complete
   * Marks a book as completed with required score
   */
  async completeBook(req, res, next) {
    try {
      // Validate book ID
      const bookId = z.coerce.number().int().positive().parse(req.params.id);

      // Validate request body
      const validated = completeBookBodySchema.parse(req.body);

      // Execute use case
      const book = await this.completeBookService.execute({
        bookId,
        ...validated
      });

      // Return updated book
      res.status(200).json({
        success: true,
        data: book.toJSON()
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }

  /**
   * PATCH /books/:id/abandon
   * Marks a book as abandoned with required score
   */
  async abandonBook(req, res, next) {
    try {
      // Validate book ID
      const bookId = z.coerce.number().int().positive().parse(req.params.id);

      // Validate request body
      const validated = abandonBookBodySchema.parse(req.body);

      // Execute use case
      const book = await this.abandonBookService.execute({
        bookId,
        ...validated
      });

      // Return updated book
      res.status(200).json({
        success: true,
        data: book.toJSON()
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }
    }
  }
}
