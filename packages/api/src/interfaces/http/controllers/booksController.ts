import { Request, Response, NextFunction } from "express";
import container from "../../../infrastructure/container/Container";
import GetAllBooks from "../../../application/usecases/GetAllBooks";
import { IBookRepository } from "../../../domain/repositories/IBookRepository";

const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = container.get<IBookRepository>("BookRepository");
    const usecase = new GetAllBooks(repo);
    const books = await usecase.execute();
    res.json({ data: books });
  } catch (err) {
    next(err);
  }
};

export default { getAll };
