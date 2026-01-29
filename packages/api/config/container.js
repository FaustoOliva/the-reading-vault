/**
 * Dependency Injection Container
 * Centralizes instantiation and wiring of all application dependencies
 */

import { HealthController } from "../controllers/healthController.js";
import { BooksController } from "../controllers/booksController.js";
import { ReadingSessionsController } from "../controllers/readingSessionsController.js";
import { MSSQLClient } from "../infraestructure/config/database.js";
import { DatabaseRepository } from "../infraestructure/database/DatabaseRepository.js";
import { BookRepository } from "../infraestructure/repositories/bookRepository.js";
import { ReadingSessionRepository } from "../infraestructure/repositories/readingSessionRepository.js";
import { BookStatusHistoryRepository } from "../infraestructure/repositories/bookStatusHistoryRepository.js";
import { GetBooksService } from "../services/getBooksService.js";
import { LogReadingSessionService } from "../services/logReadingSessionService.js";
import { config } from "./env.js";

export class DIContainer {
  constructor() {
    this.instances = new Map();
  }

  /**
   * Initialize database client
   */
  _initDatabase() {
    const mssqlClient = new MSSQLClient(config.database);
    this.instances.set("mssqlClient", mssqlClient);
  }

  /**
   * Initialize all repositories
   */
  _initRepositories() {
    const mssqlClient = this.instances.get("mssqlClient");
    const databaseRepository = new DatabaseRepository(mssqlClient);
    const bookRepository = new BookRepository(mssqlClient);
    const readingSessionRepository = new ReadingSessionRepository(mssqlClient);
    const bookStatusHistoryRepository = new BookStatusHistoryRepository(mssqlClient);
    
    this.instances.set("databaseRepository", databaseRepository);
    this.instances.set("bookRepository", bookRepository);
    this.instances.set("readingSessionRepository", readingSessionRepository);
    this.instances.set("bookStatusHistoryRepository", bookStatusHistoryRepository);
  }

  /**
   * Initialize all services with their dependencies
   */
  _initServices() {
    const mssqlClient = this.instances.get("mssqlClient");
    const bookRepository = this.instances.get("bookRepository");
    const readingSessionRepository = this.instances.get("readingSessionRepository");
    const bookStatusHistoryRepository = this.instances.get("bookStatusHistoryRepository");
    
    const getBooksService = new GetBooksService(bookRepository);
    const logReadingSessionService = new LogReadingSessionService(
      mssqlClient,
      bookRepository,
      readingSessionRepository,
      bookStatusHistoryRepository
    );
    
    this.instances.set("getBooksService", getBooksService);
    this.instances.set("logReadingSessionService", logReadingSessionService);
  }

  /**
   * Initialize all controllers with their dependencies
   */
  _initControllers() {
    const getBooksService = this.instances.get("getBooksService");
    const logReadingSessionService = this.instances.get("logReadingSessionService");
    
    this.instances.set("healthController", new HealthController());
    this.instances.set("booksController", new BooksController(getBooksService));
    this.instances.set("readingSessionsController", new ReadingSessionsController(logReadingSessionService));
  }

  /**
   * Bootstrap all dependencies in correct order
   */
  bootstrap() {
    this._initDatabase();
    this._initRepositories();
    this._initServices();
    this._initControllers();
  }

  /**
   * Get controller instance by class
   */
  getController(controllerClass) {
    const controllerName = controllerClass.name;
    const key =
      controllerName.charAt(0).toLowerCase() + controllerName.slice(1);

    const controller = this.instances.get(key);
    if (!controller) {
      throw new Error(`Controller ${controllerName} not found in DI container`);
    }

    return controller;
  }

  /**
   * Get service instance by name
   */
  getService(serviceName) {
    const service = this.instances.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in DI container`);
    }
    return service;
  }

  /**
   * Get database client
   */
  getDatabase() {
    return this.instances.get("mssqlClient");
  }

  /**
   * Get database repository
   */
  getRepository(repositoryName) {
    return this.instances.get(repositoryName);
  }
}
