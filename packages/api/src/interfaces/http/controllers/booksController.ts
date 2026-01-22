import { Request, Response, NextFunction } from "express";
import { CreateBookSchema } from "@trv/common";
import { z } from "zod";
import container from "../../../infrastructure/container/Container";
import GetBooksUseCase from "../../../application/usecases/GetAllBooks";
import CreateBookUseCase from "../../../application/usecases/CreateBook";
import GetBookByIdUseCase from "../../../application/usecases/GetBookById";
import { IBookRepository } from "../../../domain/repositories/IBookRepository";
import { IAuthorRepository } from "../../../domain/repositories/IAuthorRepository";
import { IBookStatusHistoryRepository } from "../../../domain/repositories/IBookStatusHistoryRepository";
import { IReadingSessionRepository } from "../../../domain/repositories/IReadingSessionRepository";

const bookIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number),
});

// Controller Functions

const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = container.get<IBookRepository>("BookRepository");
    const usecase = new GetBooksUseCase(repo);
    const books = await usecase.execute();

    // Map books to response format including current_reading_cycle, status, and author_name
    const response = books.map((book) => ({
      id: book.id,
      title: book.title,
      isbn: book.isbn ?? null,
      author_name: book.author_name ?? null,
      status: book.status_name ?? null,
      ui_color: book.ui_color ?? null,
      current_reading_cycle: book.current_cycle ?? 1,
      score: book.score ?? null,
      comment: book.comment ?? null,
    }));

    res.json(response);
  } catch (err) {
    next(err);
  }
};

const createBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const input = CreateBookSchema.parse(req.body);

    // Get dependencies from container
    const bookRepo = container.get<IBookRepository>("BookRepository");
    const authorRepo = container.get<IAuthorRepository>("AuthorRepository");
    const historyRepo = container.get<IBookStatusHistoryRepository>(
      "BookStatusHistoryRepository",
    );
    const sessionRepo = container.get<IReadingSessionRepository>(
      "ReadingSessionRepository",
    );

    // Execute use case
    const usecase = new CreateBookUseCase(
      bookRepo,
      authorRepo,
      historyRepo,
      sessionRepo,
    );
    const result = await usecase.execute(input);

    res.status(201).json(result);
  } catch (err) {
    // Zod validation errors
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }
    next(err);
  }
};

const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate params
    const { id } = bookIdParamSchema.parse(req.params);

    // Get repository and execute use case
    const repo = container.get<IBookRepository>("BookRepository");
    const usecase = new GetBookByIdUseCase(repo);
    const result = await usecase.execute(id);

    res.json(result);
  } catch (err) {
    // Zod validation errors
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid book ID",
        details: err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }
    next(err);
  }
};

export default { getAll, createBook, getById };
