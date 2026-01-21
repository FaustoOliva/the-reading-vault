import { Request, Response, NextFunction } from "express";
import container from "../../../infrastructure/container/Container";
import LogSessionUseCase from "../../../application/usecases/LogSessionUseCase";
import { IBookRepository } from "../../../domain/repositories/IBookRepository";
import IReadingSessionRepository from "../../../domain/repositories/IReadingSessionRepository";
import { IBookStatusHistoryRepository } from "../../../domain/repositories/IBookStatusHistoryRepository";
import { LogSessionInputSchema } from "../../../application/validators/LogSessionValidator";
import { ZodError } from "zod";

const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Parse and validate input using Zod schema
    const validatedInput = LogSessionInputSchema.parse(req.body);

    // Get repositories from DI container
    const bookRepo = container.get<IBookRepository>("BookRepository");
    const sessionRepo = container.get<IReadingSessionRepository>(
      "ReadingSessionRepository",
    );
    const historyRepo = container.get<IBookStatusHistoryRepository>(
      "BookStatusHistoryRepository",
    );

    // Instantiate and execute use case
    const usecase = new LogSessionUseCase(bookRepo, sessionRepo, historyRepo);
    const result = await usecase.execute(validatedInput);

    // Return 201 Created with session data
    res.status(201).json(result);
  } catch (err) {
    // Handle Zod validation errors
    if (err instanceof ZodError) {
      const formattedErrors = err.issues.map((error: any) => ({
        field: error.path.join("."),
        message: error.message,
      }));
      return res.status(400).json({
        error: {
          message: "Validation failed",
          details: formattedErrors,
        },
      });
    }

    // Pass other errors to error handler middleware
    next(err);
  }
};

export default { create };
