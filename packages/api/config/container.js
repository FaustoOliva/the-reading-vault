/**
 * Dependency Injection Container
 * Centralizes instantiation and wiring of all application dependencies
 */

import { HealthController } from "../controllers/healthController.js";
import { BooksController } from "../controllers/booksController.js";
import { ReadingSessionsController } from "../controllers/readingSessionsController.js";
import { AuthorsController } from "../controllers/authorsController.js";
import { CountriesController } from "../controllers/countriesController.js";
import { KpiController } from "../controllers/kpiController.js";
import { AIController } from "../controllers/aiController.js";
import { PostgreSQLClient } from "../infraestructure/config/postgresqlClient.js";
import { DatabaseRepository } from "../infraestructure/database/DatabaseRepository.js";
import { BookRepository } from "../infraestructure/repositories/bookRepository.js";
import { AuthorRepository } from "../infraestructure/repositories/authorRepository.js";
import { CountryRepository } from "../infraestructure/repositories/countryRepository.js";
import { ReadingSessionRepository } from "../infraestructure/repositories/readingSessionRepository.js";
import { BookStatusHistoryRepository } from "../infraestructure/repositories/bookStatusHistoryRepository.js";
import { AIContextRepository } from "../infraestructure/repositories/aiContextRepository.js";
import { OpenAIClient } from "../infraestructure/ai/openAIClient.js";
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
import { CalculateReadingKPIService } from "../services/calculateReadingKPIService.js";
import { GetBookReadingStatsService } from "../services/getBookReadingStatsService.js";
import { GetReaderProfileService } from "../services/getReaderProfileService.js";
import { RecommendBooksService } from "../services/recommendBooksService.js";
import { config } from "./env.js";

export class DIContainer {
  constructor() {
    this.instances = new Map();
  }

  /**
   * Initialize database client
   */
  _initDatabase() {
    const pgClient = new PostgreSQLClient(config.database);
    this.instances.set("pgClient", pgClient);
  }

  /**
   * Initialize all repositories
   */
  _initRepositories() {
    const pgClient = this.instances.get("pgClient");
    const databaseRepository = new DatabaseRepository(pgClient);
    const bookRepository = new BookRepository(pgClient);
    const authorRepository = new AuthorRepository(pgClient);
    const countryRepository = new CountryRepository(pgClient);
    const readingSessionRepository = new ReadingSessionRepository(pgClient);
    const bookStatusHistoryRepository = new BookStatusHistoryRepository(
      pgClient,
    );

    this.instances.set("databaseRepository", databaseRepository);
    this.instances.set("bookRepository", bookRepository);
    this.instances.set("authorRepository", authorRepository);
    this.instances.set("countryRepository", countryRepository);
    this.instances.set("readingSessionRepository", readingSessionRepository);
    this.instances.set(
      "bookStatusHistoryRepository",
      bookStatusHistoryRepository,
    );

    // AI Infrastructure
    const openAIClient = new OpenAIClient(config.openai);
    const aiContextRepository = new AIContextRepository(
      pgClient,
      bookRepository,
    );

    this.instances.set("openAIClient", openAIClient);
    this.instances.set("aiContextRepository", aiContextRepository);
  }

  /**
   * Initialize all services with their dependencies
   */
  _initServices() {
    const pgClient = this.instances.get("pgClient");
    const bookRepository = this.instances.get("bookRepository");
    const authorRepository = this.instances.get("authorRepository");
    const countryRepository = this.instances.get("countryRepository");
    const readingSessionRepository = this.instances.get(
      "readingSessionRepository",
    );
    const bookStatusHistoryRepository = this.instances.get(
      "bookStatusHistoryRepository",
    );
    const aiContextRepository = this.instances.get("aiContextRepository");
    const openAIClient = this.instances.get("openAIClient");

    const getBooksService = new GetBooksService(bookRepository);
    const getBookByIdService = new GetBookByIdService(
      bookRepository,
      readingSessionRepository,
    );
    const createBookService = new CreateBookService(
      pgClient,
      bookRepository,
      authorRepository,
      countryRepository,
      bookStatusHistoryRepository,
    );
    const logReadingSessionService = new LogReadingSessionService(
      pgClient,
      bookRepository,
      readingSessionRepository,
      bookStatusHistoryRepository,
    );
    const updateBookService = new UpdateBookService(
      pgClient,
      bookRepository,
    );
    const reviewBookService = new ReviewBookService(
      pgClient,
      bookRepository,
      bookStatusHistoryRepository,
      null, // Will be set after getReaderProfileService is created
    );
    const reopenBookService = new ReopenBookService(
      pgClient,
      bookRepository,
      bookStatusHistoryRepository,
      null, // Will be set after getReaderProfileService is created
    );
    const requestReviewService = new RequestReviewService(
      pgClient,
      bookRepository,
      bookStatusHistoryRepository,
    );
    const getAuthorsService = new GetAuthorsService(authorRepository);
    const getCountriesService = new GetCountriesService(countryRepository);
    const calculateReadingKPIService = new CalculateReadingKPIService(
      bookRepository,
      readingSessionRepository,
    );
    const getBookReadingStatsService = new GetBookReadingStatsService(
      bookRepository,
      readingSessionRepository,
      bookStatusHistoryRepository,
    );
    const getReaderProfileService = new GetReaderProfileService(
      aiContextRepository,
      openAIClient,
    );
    const recommendBooksService = new RecommendBooksService(
      getReaderProfileService,
      openAIClient,
    );

    // Inject getReaderProfileService into services that need it
    reviewBookService.getReaderProfileService = getReaderProfileService;
    reopenBookService.getReaderProfileService = getReaderProfileService;

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
    this.instances.set(
      "calculateReadingKPIService",
      calculateReadingKPIService,
    );
    this.instances.set(
      "getBookReadingStatsService",
      getBookReadingStatsService,
    );
    this.instances.set("getReaderProfileService", getReaderProfileService);
    this.instances.set("recommendBooksService", recommendBooksService);
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
    const logReadingSessionService = this.instances.get(
      "logReadingSessionService",
    );
    const getAuthorsService = this.instances.get("getAuthorsService");
    const getCountriesService = this.instances.get("getCountriesService");
    const calculateReadingKPIService = this.instances.get(
      "calculateReadingKPIService",
    );
    const getBookReadingStatsService = this.instances.get(
      "getBookReadingStatsService",
    );
    const recommendBooksService = this.instances.get("recommendBooksService");

    const pgClient = this.instances.get("pgClient");
    this.instances.set(
      "healthController",
      new HealthController(pgClient, this),
    );
    this.instances.set(
      "booksController",
      new BooksController(
        getBooksService,
        getBookByIdService,
        updateBookService,
        reviewBookService,
        reopenBookService,
        requestReviewService,
        createBookService,
        getBookReadingStatsService,
      ),
    );
    this.instances.set(
      "readingSessionsController",
      new ReadingSessionsController(logReadingSessionService),
    );
    this.instances.set(
      "authorsController",
      new AuthorsController(getAuthorsService),
    );
    this.instances.set(
      "countriesController",
      new CountriesController(getCountriesService),
    );
    this.instances.set(
      "kpiController",
      new KpiController(calculateReadingKPIService),
    );
    this.instances.set("aiController", new AIController(recommendBooksService));
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
    return this.instances.get("pgClient");
  }

  /**
   * Get database repository
   */
  getRepository(repositoryName) {
    return this.instances.get(repositoryName);
  }
}
