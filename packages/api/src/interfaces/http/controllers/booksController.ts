import { Request, Response, NextFunction } from "express";
import container from "../../../infrastructure/container/Container";
import GetBooksUseCase from "../../../application/usecases/GetAllBooks";
import { IBookRepository } from "../../../domain/repositories/IBookRepository";

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

export default { getAll };
