/**
 * GenresController
 * Handles HTTP requests for genre operations
 *
 * Responsibilities:
 * - Call services
 * - Format HTTP responses
 * - Forward errors to global middleware
 *
 * Rules:
 * - No business logic
 * - No domain error creation
 */

export class GenresController {
  constructor(getGenresService) {
    this.getGenresService = getGenresService;
  }

  /**
   * GET /genres
   * Returns all existing genres sorted alphabetically
   */
  async getGenres(req, res, next) {
    try {
      const result = await this.getGenresService.execute();

      res.status(200).json({
        success: true,
        data: result.genres,
      });
    } catch (error) {
      next(error);
    }
  }
}
