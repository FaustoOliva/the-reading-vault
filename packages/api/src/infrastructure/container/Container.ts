import { IBookRepository } from "../../domain/repositories/IBookRepository";
import { BookRepositoryImpl } from "../repositories/BookRepositoryImpl";
import IReadingSessionRepository from "../../domain/repositories/IReadingSessionRepository";
import { ReadingSessionRepositoryImpl } from "../repositories/ReadingSessionRepositoryImpl";
import { IBookStatusHistoryRepository } from "../../domain/repositories/IBookStatusHistoryRepository";
import BookStatusHistoryRepositoryImpl from "../repositories/BookStatusHistoryRepositoryImpl";
import { IAuthorRepository } from "../../domain/repositories/IAuthorRepository";
import { AuthorRepositoryImpl } from "../repositories/AuthorRepositoryImpl";

class Container {
  private services = new Map<string, any>();

  register<T>(name: string, instance: T) {
    this.services.set(name, instance);
  }

  get<T>(name: string): T {
    const svc = this.services.get(name);
    if (!svc) throw new Error(`Service not registered: ${name}`);
    return svc as T;
  }
}

const container = new Container();

// Register default implementations. Tests can override by calling `register`.
container.register<IBookRepository>("BookRepository", new BookRepositoryImpl());
container.register<IReadingSessionRepository>(
  "ReadingSessionRepository",
  new ReadingSessionRepositoryImpl(),
);
container.register<IBookStatusHistoryRepository>(
  "BookStatusHistoryRepository",
  new BookStatusHistoryRepositoryImpl(),
);
container.register<IAuthorRepository>(
  "AuthorRepository",
  new AuthorRepositoryImpl(),
);

export default container;
