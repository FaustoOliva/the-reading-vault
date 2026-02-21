import { HealthController } from "../controllers/healthController.js";
import { Router } from "express";
import { loggerMiddleware } from "../middlewares/loggerMiddleware.js";

export default function healthCheckRoutes(getController) {
  const router = Router();
  router.use(loggerMiddleware);

  router.get("/healthCheck", (req, res) =>
    getController(HealthController).healthCheck(req, res),
  );

  return router;
}
