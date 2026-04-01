/**
 * BookTypesController
 * Handles HTTP requests for book types operations
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

export class BookTypesController {
  constructor(getBookTypesService) {
    this.getBookTypesService = getBookTypesService;
  }

  /**
   * GET /book-types
   * Returns all predefined book types sorted alphabetically
   */
  async getBookTypes(req, res, next) {
    try {
      // Execute use case
      const result = await this.getBookTypesService.execute();

      // Return response
      res.status(200).json({
        success: true,
        data: result.bookTypes,
      });
    } catch (error) {
      next(error);
    }
  }
}
