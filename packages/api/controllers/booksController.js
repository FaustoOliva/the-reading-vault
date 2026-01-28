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

export class BooksController {
  constructor(getBooksService) {
    this.getBooksService = getBooksService;
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
}
