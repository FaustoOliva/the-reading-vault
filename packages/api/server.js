import express from "express";
import cors from "cors";
//import { globalRateLimiter } from "./middlewares/rateLimitMiddleware.js";

export class Server {
  #controllers = {};
  #app;
  #routes;

  constructor(app, port) {
    this.#app = app;
    this.port = port;
    this.#routes = [];

    this.#app.use(express.json());
    this.#app.use(express.urlencoded({ extended: true }));

    this.#app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
          : true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      }),
    );
  }

  get app() {
    return this.#app;
  }

  setController(controllerClass, controller) {
    this.#controllers[controllerClass.name] = controller;
  }

  getController(controllerClass) {
    const controller = this.#controllers[controllerClass.name];
    if (!controller) {
      throw new Error("Controller missing for the given route.");
    }
    return controller;
  }

  addRoute(route) {
    this.#routes.push(route);
  }

  configureRoutes() {
    const apiPrefix = "/api";
    this.#routes.forEach((route) =>
      this.#app.use(apiPrefix, route(this.getController.bind(this))),
    );
  }

  launch() {
    this.app.listen(this.port, () => {
      console.log("Server running on port " + this.port);
    });
  }
}
