/**
 * GetBookTypesService (Query Use Case)
 * Retrieves all predefined book types sorted alphabetically
 *
 * Responsibilities:
 * - Implement GetBookTypes use case
 * - Orchestrate repository calls
 * - Return book type records
 *
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - No transactions needed (read-only operation)
 * - Returns book types array directly
 */

export class GetBookTypesService {
  constructor(bookTypesRepository) {
    this.bookTypesRepository = bookTypesRepository;
  }

  /**
   * Execute GetBookTypes use case
   * @returns {Promise<{bookTypes: Array<{id: number, name: string}>}>}
   */
  async execute() {
    // Delegate to repository
    const bookTypes = await this.bookTypesRepository.getAll();

    return { bookTypes };
  }
}
