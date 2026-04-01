/**
 * GetBooksService (Query Use Case)
 * Retrieves all books with optional filtering
 *
 * Responsibilities:
 * - Implement GetBooks use case as defined in USE_CASES.md
 * - Orchestrate repository calls
 * - Return Book domain entities
 *
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - No transactions needed (read-only operation)
 * - Returns Book[] directly
 */

export class GetBooksService {
  constructor(bookRepository) {
    this.bookRepository = bookRepository;
  }

  /**
   * Execute GetBooks use case
   * @param {Object} filters - Optional filters { status, authorId, countryId, titleSearch, minScore, maxScore, minPages, maxPages, startDate, endDate }
   * @param {Object} pagination - Pagination params { page, limit }
   * @returns {Promise<{books: Book[], total: number, page: number, limit: number, totalPages: number}>}
   */
  async execute(filters = {}, pagination = { page: 1, limit: 10 }) {
    // Delegate to repository
    const result = await this.bookRepository.getAll(filters, pagination);

    return result;
  }
}
