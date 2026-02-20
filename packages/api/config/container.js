/**
 * Dependency Injection Container
 * Centralizes instantiation and wiring of all application dependencies
 */

import { HealthController } from "../controllers/healthController.js";
import { BooksController } from "../controllers/booksController.js";
import { ReadingSessionsController } from "../controllers/readingSessionsController.js";
import { AuthorsController } from "../controllers/authorsController.js";
import { CountriesController } from "../controllers/countriesController.js";
import { MSSQLClient } from "../infraestructure/config/database.js";
import { DatabaseRepository } from "../infraestructure/database/DatabaseRepository.js";
import { BookRepository } from "../infraestructure/repositories/bookRepository.js";
import { AuthorRepository } from "../infraestructure/repositories/authorRepository.js";
import { CountryRepository } from "../infraestructure/repositories/countryRepository.js";
import { ReadingSessionRepository } from "../infraestructure/repositories/readingSessionRepository.js";
import { BookStatusHistoryRepository } from "../infraestructure/repositories/bookStatusHistoryRepository.js";
import { GetBooksService } from "../services/getBooksService.js";
import { GetBookByIdService } from "../services/getBookByIdService.js";
import { CreateBookService } from "../services/createBookService.js";
import { LogReadingSessionService } from "../services/logReadingSessionService.js";
import { UpdateBookService } from "../services/updateBookService.js";
import { ReviewBookService } from "../services/reviewBookService.js";
import { ReopenBookService } from "../services/reopenBookService.js";
import { RequestReviewService } from "../services/requestReviewService.js";
import { GetAuthorsService } from "../services/getAuthorsService.js";
import { GetCountriesService } from "../services/getCountriesService.js";
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
    const authorRepository = new AuthorRepository(mssqlClient);
    const countryRepository = new CountryRepository(mssqlClient);
    const readingSessionRepository = new ReadingSessionRepository(mssqlClient);
    const bookStatusHistoryRepository = new BookStatusHistoryRepository(mssqlClient);
    
    this.instances.set("databaseRepository", databaseRepository);
    this.instances.set("bookRepository", bookRepository);
    this.instances.set("authorRepository", authorRepository);
    this.instances.set("countryRepository", countryRepository);
    this.instances.set("readingSessionRepository", readingSessionRepository);
    this.instances.set("bookStatusHistoryRepository", bookStatusHistoryRepository);
  }

  /**
   * Initialize all services with their dependencies
   */
  _initServices() {
    const mssqlClient = this.instances.get("mssqlClient");
    const bookRepository = this.instances.get("bookRepository");
    const authorRepository = this.instances.get("authorRepository");
    const countryRepository = this.instances.get("countryRepository");
    const readingSessionRepository = this.instances.get("readingSessionRepository");
    const bookStatusHistoryRepository = this.instances.get("bookStatusHistoryRepository");
    
    const getBooksService = new GetBooksService(bookRepository);
    const getBookByIdService = new GetBookByIdService(
      bookRepository,
      readingSessionRepository
    );
    const createBookService = new CreateBookService(
      mssqlClient,
      bookRepository,
      authorRepository,
      countryRepository,
      bookStatusHistoryRepository
    );
    const logReadingSessionService = new LogReadingSessionService(
      mssqlClient,
      bookRepository,
      readingSessionRepository,
      bookStatusHistoryRepository
    );
    const updateBookService = new UpdateBookService(
      mssqlClient,
      bookRepository
    );
    const reviewBookService = new ReviewBookService(
      mssqlClient,
      bookRepository,
      bookStatusHistoryRepository
    );
    const reopenBookService = new ReopenBookService(
      mssqlClient,
      bookRepository,
      bookStatusHistoryRepository
    );
    const requestReviewService = new RequestReviewService(
      mssqlClient,
      bookRepository,
      bookStatusHistoryRepository
    );
    const getAuthorsService = new GetAuthorsService(authorRepository);
    const getCountriesService = new GetCountriesService(countryRepository);
    
    this.instances.set("getBooksService", getBooksService);
    this.instances.set("getBookByIdService", getBookByIdService);
    this.instances.set("createBookService", createBookService);
    this.instances.set("logReadingSessionService", logReadingSessionService);
    this.instances.set("updateBookService", updateBookService);
    this.instances.set("reviewBookService", reviewBookService);
    this.instances.set("reopenBookService", reopenBookService);
    this.instances.set("requestReviewService", requestReviewService);
    this.instances.set("getAuthorsService", getAuthorsService);
    this.instances.set("getCountriesService", getCountriesService);
  }

  /**
   * Initialize all controllers with their dependencies
   */
  _initControllers() {
    const getBooksService = this.instances.get("getBooksService");
    const createBookService = this.instances.get("createBookService");
    const getBookByIdService = this.instances.get("getBookByIdService");
    const updateBookService = this.instances.get("updateBookService");
    const reviewBookService = this.instances.get("reviewBookService");
    const reopenBookService = this.instances.get("reopenBookService");
    const requestReviewService = this.instances.get("requestReviewService");
    const logReadingSessionService = this.instances.get("logReadingSessionService");
    const getAuthorsService = this.instances.get("getAuthorsService");
    const getCountriesService = this.instances.get("getCountriesService");
    
    this.instances.set("healthController", new HealthController());
    this.instances.set("booksController", new BooksController(
      getBooksService,
      getBookByIdService,
      updateBookService,
      reviewBookService,
      reopenBookService,
      requestReviewService,
      createBookService
    ));
    this.instances.set("readingSessionsController", new ReadingSessionsController(logReadingSessionService));
    this.instances.set("authorsController", new AuthorsController(getAuthorsService));
    this.instances.set("countriesController", new CountriesController(getCountriesService));
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
