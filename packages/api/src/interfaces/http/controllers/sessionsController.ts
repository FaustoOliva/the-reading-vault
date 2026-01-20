import { Request, Response, NextFunction } from "express";
import container from "../../../infrastructure/container/Container";
import AddReadingSessionUseCase from "../../../application/usecases/AddReadingSession";
import { IBookRepository } from "../../../domain/repositories/IBookRepository";
import IReadingSessionRepository from "../../../domain/repositories/IReadingSessionRepository";

const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookId, pagesRead, occurredAt } = req.body;
    if (typeof bookId !== "number" || typeof pagesRead !== "number") {
      return res.status(400).json({ message: "bookId and pagesRead must be numbers" });
    }

    const bookRepo = container.get<IBookRepository>("BookRepository");
    const sessionRepo = container.get<IReadingSessionRepository>("ReadingSessionRepository");

    const usecase = new AddReadingSessionUseCase(bookRepo, sessionRepo);
    const occurred = occurredAt ? new Date(occurredAt) : undefined;
    const result = await usecase.execute(bookId, pagesRead, occurred ?? null);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export default { create };
