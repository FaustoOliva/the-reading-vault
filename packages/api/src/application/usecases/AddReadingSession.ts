import { IBookRepository } from "../../domain/repositories/IBookRepository";
import IReadingSessionRepository from "../../domain/repositories/IReadingSessionRepository";

export class AddReadingSessionUseCase {
  constructor(
    private bookRepo: IBookRepository,
    private sessionRepo: IReadingSessionRepository
  ) {}

  async execute(bookId: number, pagesRead: number): Promise<{ sessionId: number }> {
    const book = await this.bookRepo.findById(bookId);
    if (!book) throw new Error("Book not found");

    const sessionId = await this.sessionRepo.addReadingSession(bookId, pagesRead);
    return { sessionId };
  }
}

export default AddReadingSessionUseCase;
