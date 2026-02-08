/**
 * GetAuthorsService (Query Use Case)
 * Retrieves all authors with optional filtering, sorted alphabetically
 * 
 * Responsibilities:
 * - Implement GetAuthors use case as defined in USE_CASES.md
 * - Orchestrate repository calls
 * - Return author records
 * 
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - No transactions needed (read-only operation)
 * - Returns authors array directly
 */

export class GetAuthorsService {
  constructor(authorRepository) {
    this.authorRepository = authorRepository;
  }

  /**
   * Execute GetAuthors use case
   * @param {Object} filters - Optional filters { nameLike }
   * @returns {Promise<{authors: Array<{id: number, name: string, nationality: string | null}>}>}
   */
  async execute(filters = {}) {
    // Delegate to repository
    const authors = await this.authorRepository.getAll(filters);
    
    return { authors };
  }
}
