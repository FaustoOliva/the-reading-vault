/**
 * GetCountriesService (Query Use Case)
 * Retrieves all countries with optional filtering, sorted alphabetically
 *
 * Responsibilities:
 * - Implement GetCountries use case as defined in USE_CASES.md
 * - Orchestrate repository calls
 * - Return country records
 *
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - No transactions needed (read-only operation)
 * - Returns countries array directly
 */

export class GetCountriesService {
  constructor(countryRepository) {
    this.countryRepository = countryRepository;
  }

  /**
   * Execute GetCountries use case
   * @param {Object} filters - Optional filters { nameLike }
   * @returns {Promise<{countries: Array<{id: number, name: string, isoCode: string}>}>}
   */
  async execute(filters = {}) {
    // Delegate to repository
    const countries = await this.countryRepository.getAll(filters);

    return { countries };
  }
}
