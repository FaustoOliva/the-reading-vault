/**
 * Dependency Injection Container
 * Centralizes instantiation and wiring of all application dependencies
 */

import { HealthController } from "../controllers/healthController.js";
import { MSSQLClient } from "../infraestructure/config/database.js";
import { DatabaseRepository } from "../infraestructure/database/DatabaseRepository.js";
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
    this.instances.set("databaseRepository", databaseRepository);
  }

  /**
   * Initialize all services with their dependencies
   */
  _initServices() {
  }

  /**
   * Initialize all controllers with their dependencies
   */
  _initControllers() {
    this.instances.set("healthController", new HealthController());
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
