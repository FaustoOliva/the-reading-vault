import { Request, Response, NextFunction } from "express";
import container from "../../../infrastructure/container/Container";
import GetBooksUseCase from "../../../application/usecases/GetAllBooks";
import { IBookRepository } from "../../../domain/repositories/IBookRepository";

const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = container.get<IBookRepository>("BookRepository");
    const usecase = new GetBooksUseCase(repo);
    const books = await usecase.execute();
    // Map books to the required response shape
    const response = books.map((b) => ({
      id: b.id,
      title: b.title,
      author_name: b.author_name ?? null,
      status_name: b.status_name ?? null,
      ui_color: b.ui_color ?? null,
      score: b.score ?? null,
    }));
    res.json(response);
  } catch (err) {
    next(err);
  }
};

export default { getAll };
