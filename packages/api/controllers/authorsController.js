/**
 * AuthorsController
 * Handles HTTP requests for author-related operations
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
 * Validation schema for GetAuthors query parameters
 */
const getAuthorsQuerySchema = z.object({
  nameLike: z.string().min(1).optional()
}).strict();

export class AuthorsController {
  constructor(getAuthorsService) {
    this.getAuthorsService = getAuthorsService;
  }

  /**
   * GET /authors
   * Returns all authors sorted alphabetically with optional filtering
   */
  async getAuthors(req, res, next) {
    try {
      // Validate query parameters
      const validated = getAuthorsQuerySchema.parse(req.query);

      // Execute use case
      const result = await this.getAuthorsService.execute(validated);

      // Return response
      res.status(200).json({
        success: true,
        data: result.authors
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }
}
