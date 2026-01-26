import "dotenv/config";
import express from "express";
import { Server } from "./server.js";
import routes from "./routes/routes.js";
import { globalErrorMiddleware } from "./middlewares/globalErrorMiddleware.js";
import { validateEnv, config } from "./config/env.js";
import { DIContainer } from "./config/container.js";


async function bootstrap() {
  let database = null;

  try {
    // 1. Validate environment variables
    validateEnv();

    // 2. Initialize DI Container
    const container = new DIContainer();
    container.bootstrap();

    // 3. Create Express app and server
    // 3. Get database client from container
    database = container.getDatabase();

    // 4. Connect to database
    await database.connect();

    // 5. Create Express app and server
    const app = express();
    const server = new Server(app, config.port);

    // 4. Register all controllers
    container.instances.forEach((instance, key) => {
      if (key.endsWith("Controller")) {
        const controllerClass = instance.constructor;
        server.setController(controllerClass, instance);
      }
    });

    // 7. Configure routes
    routes.forEach((route) => server.addRoute(route));
    server.configureRoutes();

    // 8. Register global error middleware (must be last)
    server.app.use(globalErrorMiddleware);

    // 9. Launch server
    server.launch();
    console.log(`Environment: ${config.nodeEnv}`);
  } catch (error) {
    console.error("✗ Application startup failed:", error.message);
    if (database) {
      await database.disconnect();
    }
    process.exit(1);
  }
}

// Graceful shutdown handler
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  const container = new DIContainer();
  const database = container.getDatabase();
  if (database) {
    await database.disconnect();
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  const container = new DIContainer();
  const database = container.getDatabase();
  if (database) {
    await database.disconnect();
  }
  process.exit(0);
});

// Start application
bootstrap();