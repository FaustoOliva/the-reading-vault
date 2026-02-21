/**
 * KPI Routes
 * Defines HTTP endpoints for KPI and metrics operations
 *
 * Architecture:
 * - Routes delegate to controllers
 * - Controllers validate and call services
 * - Services execute use cases
 */

import { Router } from "express";
import { KpiController } from "../controllers/kpiController.js";
import { loggerMiddleware } from "../middlewares/loggerMiddleware.js";

export default function kpiRoutes(getController) {
  const router = Router();
  router.use(loggerMiddleware);

  /**
   * GET /kpis/global
   * Get global reading KPIs
   * Query params: date_from?, date_to?
   */
  router.get("/kpis/global", (req, res, next) =>
    getController(KpiController).getGlobalKPIs(req, res, next),
  );

  return router;
}
