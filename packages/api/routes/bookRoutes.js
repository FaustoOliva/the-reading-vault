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
    getController(BooksController).getBooks(req, res, next)
  );

  /**
   * POST /books
   * Creates a new book
   * Body: { title, isbn?, totalPages?, author: { name, nationality? } }
   */
  router.post("/books", (req, res, next) =>
    getController(BooksController).createBook(req, res, next)
  );

  /**
   * GET /books/:id
   * Returns detailed information about a single book
   * Params: id (number)
   */
  router.get("/books/:id", (req, res, next) =>
    getController(BooksController).getBookById(req, res, next)
  );

  return router;
}
