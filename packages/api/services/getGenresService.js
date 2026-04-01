/**
 * GetGenresService (Query Use Case)
 * Retrieves all existing genres sorted alphabetically
 *
 * Responsibilities:
 * - Implement GetGenres use case
 * - Orchestrate repository calls
 * - Return genre records
 *
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - No transactions needed (read-only operation)
 * - Returns genres array directly
 */

export class GetGenresService {
  constructor(genresRepository) {
    this.genresRepository = genresRepository;
  }

  /**
   * Execute GetGenres use case
   * @returns {Promise<{genres: Array<{id: number, name: string}>}>}
   */
  async execute() {
    const genres = await this.genresRepository.getAll();

    return { genres };
  }
}
