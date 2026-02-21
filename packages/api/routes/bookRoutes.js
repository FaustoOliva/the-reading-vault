/**
 * Book Routes
 * Defines HTTP routes for book-related operations
 *
 * Responsibilities:
 * - Declare HTTP routes
 * - Bind routes to controller methods
 * - Apply route-level middlewares
 *
 * Rules:
 * - No business logic
 * - No validation
 * - No error handling
 */

import { Router } from "express";
import { BooksController } from "../controllers/booksController.js";
import { loggerMiddleware } from "../middlewares/loggerMiddleware.js";

export default function bookRoutes(getController) {
  const router = Router();
  router.use(loggerMiddleware);

  /**
   * GET /books
   * Returns all books with optional filters
   * Query params: status, authorId
   */
  router.get("/books", (req, res, next) =>
    getController(BooksController).getBooks(req, res, next),
  );

  /**
   * POST /books
   * Creates a new book
   * Body: { title, isbn?, totalPages?, author: { name, nationality? } }
   */
  router.post("/books", (req, res, next) =>
    getController(BooksController).createBook(req, res, next),
  );

  /**
   * GET /books/:id
   * Returns detailed information about a single book
   * Params: id (number)
   */
  router.get("/books/:id", (req, res, next) =>
    getController(BooksController).getBookById(req, res, next),
  );

  /**
   * PUT /books/:id
   * Updates book metadata (title, totalPages, score, comment)
   * Params: id (number)
   * Body: { title?, totalPages?, score?, comment? }
   */
  router.put("/books/:id", (req, res, next) =>
    getController(BooksController).updateBook(req, res, next),
  );

  /**
   * PATCH /books/:id/review
   * Transitions PENDING_SCORE book to COMPLETED or ABANDONED with score
   * Params: id (number)
   * Body: { targetStatus: 'COMPLETED'|'ABANDONED', score, comment? }
   */
  router.patch("/books/:id/review", (req, res, next) =>
    getController(BooksController).reviewBook(req, res, next),
  );

  /**
   * PATCH /books/:id/request-review
   * Manually transitions READING book to PENDING_SCORE
   * Use case: User wants to abandon or close book without completing all pages
   * Params: id (number)
   * Body: none
   */
  router.patch("/books/:id/request-review", (req, res, next) =>
    getController(BooksController).requestReview(req, res, next),
  );

  /**
   * PATCH /books/:id/reopen
   * Reopens an ABANDONED book, transitioning to READING
   * Params: id (number)
   * Body: none
   */
  router.patch("/books/:id/reopen", (req, res, next) =>
    getController(BooksController).reopenBook(req, res, next),
  );

  /**
   * GET /books/:id/stats
   * Get detailed reading statistics for a specific book
   * Params: id (number)
   */
  router.get("/books/:id/stats", (req, res, next) =>
    getController(BooksController).getBookStats(req, res, next),
  );

  return router;
}
