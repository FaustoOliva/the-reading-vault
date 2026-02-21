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
const getBooksQuerySchema = z
  .object({
    status: z
      .enum([
        BookStatus.WISH_LIST,
        BookStatus.READING,
        BookStatus.COMPLETED,
        BookStatus.ABANDONED,
        BookStatus.PENDING_SCORE,
      ])
      .optional(),
    authorId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  })
  .strict();

/**
 * Validation schema for CreateBook request body
 */
const createBookBodySchema = z
  .object({
    title: z.string().min(1).max(255),
    isbn: z.string().max(20).optional(),
    totalPages: z.number().int().positive().optional(),
    status: z
      .enum([
        BookStatus.WISH_LIST,
        BookStatus.READING,
        BookStatus.COMPLETED,
        BookStatus.ABANDONED,
      ])
      .optional(),
    score: z.number().min(0).max(10).optional(),
    comment: z.string().optional(),
    author: z.object({
      name: z.string().min(1).max(255),
      nationality: z.string().max(40).optional(),
    }),
  })
  .strict()
  .refine(
    (data) => {
      // If status is COMPLETED or ABANDONED, score is required
      if (
        data.status === BookStatus.COMPLETED ||
        data.status === BookStatus.ABANDONED
      ) {
        return data.score !== undefined && data.score !== null;
      }
      return true;
    },
    {
      message:
        "Score is required when creating a book with COMPLETED or ABANDONED status",
      path: ["score"],
    },
  );

/**
 * Validation schema for UpdateBook request body
 */
const updateBookBodySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  totalPages: z.number().int().positive().optional(),
  score: z.number().min(0).max(10).optional(),
  comment: z.string().optional(),
});

/**
 * Validation schema for ReviewBook request body
 */
const reviewBookBodySchema = z.object({
  targetStatus: z.enum([BookStatus.COMPLETED, BookStatus.ABANDONED]),
  score: z.number().min(0).max(10),
  comment: z.string().optional(),
});

export class BooksController {
  constructor(
    getBooksService,
    getBookByIdService,
    updateBookService,
    reviewBookService,
    reopenBookService,
    requestReviewService,
    createBookService,
    getBookReadingStatsService
  ) {
    this.getBooksService = getBooksService;
    this.getBookByIdService = getBookByIdService;
    this.updateBookService = updateBookService;
    this.reviewBookService = reviewBookService;
    this.reopenBookService = reopenBookService;
    this.requestReviewService = requestReviewService;
    this.createBookService = createBookService;
    this.getBookReadingStatsService = getBookReadingStatsService;
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
      const result = await this.getBooksService.execute(filters, {
        page,
        limit,
      });

      // Convert domain entities to JSON
      const booksJSON = result.books.map((book) => book.toJSON());

      // Return paginated response
      res.status(200).json({
        success: true,
        data: booksJSON,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
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
        data: book.toJSON(),
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
        data: result,
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }
  /**
   * PUT /books/:id
   * Updates book metadata (title, totalPages, score, comment)
   */
  async updateBook(req, res, next) {
    try {
      // Validate book ID
      const bookId = z.coerce.number().int().positive().parse(req.params.id);

      // Validate request body
      const validated = updateBookBodySchema.parse(req.body);

      // Execute use case
      const book = await this.updateBookService.execute(bookId, validated);

      // Return updated book
      res.status(200).json({
        success: true,
        data: book.toJSON(),
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }

  /**
   * PATCH /books/:id/review
   * Transitions PENDING_SCORE book to COMPLETED or ABANDONED with score
   */
  async reviewBook(req, res, next) {
    try {
      // Validate book ID
      const bookId = z.coerce.number().int().positive().parse(req.params.id);

      // Validate request body
      const validated = reviewBookBodySchema.parse(req.body);

      // Execute use case
      const book = await this.reviewBookService.execute(bookId, validated);

      // Return updated book
      res.status(200).json({
        success: true,
        data: book.toJSON(),
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }

  /**
   * PATCH /books/:id/reopen
   * Reopens an ABANDONED book, transitioning to READING
   */
  async reopenBook(req, res, next) {
    try {
      // Validate book ID
      const bookId = z.coerce.number().int().positive().parse(req.params.id);

      // Execute use case
      const book = await this.reopenBookService.execute(bookId);

      // Return updated book
      res.status(200).json({
        success: true,
        data: book.toJSON(),
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }

  /**
   * PATCH /books/:id/request-review
   * Manually transitions READING book to PENDING_SCORE
   * Use case: User wants to abandon or close book without completing all pages
   */
  async requestReview(req, res, next) {
    try {
      // Validate book ID
      const bookId = z.coerce.number().int().positive().parse(req.params.id);

      // Execute use case
      const book = await this.requestReviewService.execute(bookId);

      // Return updated book
      res.status(200).json({
        success: true,
        data: book.toJSON(),
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }

  /**
   * GET /books/:id/stats
   * Get detailed reading statistics for a specific book
   */
  async getBookStats(req, res, next) {
    try {
      // Validate book ID
      const bookId = z.coerce.number().int().positive().parse(req.params.id);

      // Execute use case
      const stats = await this.getBookReadingStatsService.execute(bookId);

      // Return stats
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }
}
