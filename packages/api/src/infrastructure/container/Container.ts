import { IBookRepository } from "../../domain/repositories/IBookRepository";
import { BookRepositoryImpl } from "../repositories/BookRepositoryImpl";

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

export default container;
