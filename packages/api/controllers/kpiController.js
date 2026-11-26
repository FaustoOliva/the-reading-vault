/**
 * KpiController
 * Handles HTTP requests for KPI and metrics operations
 *
 * Responsibilities:
 * - Validate input using Zod
 * - Call KPI services
 * - Format HTTP responses
 * - Forward errors to global middleware
 *
 * Rules:
 * - No business logic
 * - Validation only happens here
 * - No domain error creation
 */

import { z } from "zod";

/**
 * Validation schema for GetGlobalKPIs query parameters
 */
const getGlobalKPIsQuerySchema = z
  .object({
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.date_from && data.date_to) {
        return new Date(data.date_from) <= new Date(data.date_to);
      }
      return true;
    },
    {
      message: "date_from must be before or equal to date_to",
      path: ["date_from"],
    },
  );

/**
 * Validation schema for GetAnnualReadingSummary query parameters
 */
const getAnnualSummaryQuerySchema = z
  .object({
    year: z.coerce.number().int().min(1000).max(9999).optional(),
  })
  .strict();

export class KpiController {
  constructor(calculateReadingKPIService, getAnnualReadingSummaryService) {
    this.calculateReadingKPIService = calculateReadingKPIService;
    this.getAnnualReadingSummaryService = getAnnualReadingSummaryService;
  }

  /**
   * GET /api/kpis/global
   * Get global reading KPIs
   */
  async getGlobalKPIs(req, res, next) {
    try {
      const validated = getGlobalKPIsQuerySchema.parse(req.query);

      const filters = {};
      if (validated.date_from) {
        filters.date_from = new Date(validated.date_from);
      }
      if (validated.date_to) {
        filters.date_to = new Date(validated.date_to);
      }

      const result = await this.calculateReadingKPIService.execute(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/kpis/annual
   * Get annual reading statistics for a single year
   */
  async getAnnualSummary(req, res, next) {
    try {
      const validated = getAnnualSummaryQuerySchema.parse(req.query);
      const year = validated.year ?? new Date().getFullYear();

      const result = await this.getAnnualReadingSummaryService.execute(year);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
