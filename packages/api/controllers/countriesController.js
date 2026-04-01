/**
 * CountriesController
 * Handles HTTP requests for country-related operations
 *
 * Responsibilities:
 * - Validate input using Zod
 * - Call services
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
 * Validation schema for GetCountries query parameters
 */
const getCountriesQuerySchema = z
  .object({
    nameLike: z.string().min(1).optional(),
  })
  .strict();

export class CountriesController {
  constructor(getCountriesService) {
    this.getCountriesService = getCountriesService;
  }

  /**
   * GET /countries
   * Returns all countries sorted alphabetically with optional filtering
   */
  async getCountries(req, res, next) {
    try {
      // Validate query parameters
      const validated = getCountriesQuerySchema.parse(req.query);

      // Execute use case
      const result = await this.getCountriesService.execute(validated);

      // Return response
      res.status(200).json({
        success: true,
        data: result.countries,
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }
}
