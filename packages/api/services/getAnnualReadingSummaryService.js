/**
 * GetAnnualReadingSummaryService (Query Use Case)
 * Builds the annual reading statistics for a single year
 *
 * Responsibilities:
 * - Orchestrate the read-model queries for annual finishes and activity
 * - Compose finished cycles into the AnnualReadingSummary domain entity
 * - Expose the years that contain at least one finished cycle
 *
 * Rules:
 * - Framework-agnostic
 * - No validation (handled by controller)
 * - No transactions needed (read-only operation)
 * - No fabricated zero durations or scores for cycles without data
 * - Session activity is passed through untouched; the domain entity normalizes
 *   it into independent monthly totals that stay separate from finished-cycle
 *   effort
 */

import { ReadingCycleSummary } from "../models/ReadingCycleSummary.js";
import { AnnualReadingSummary } from "../models/AnnualReadingSummary.js";

export class GetAnnualReadingSummaryService {
  constructor(readingStatsRepository) {
    this.readingStatsRepository = readingStatsRepository;
  }

  /**
   * Execute GetAnnualReadingSummary use case
   * @param {number} year - Calendar year to summarize
   * @returns {Promise<Object>} Annual summary plus available years
   */
  async execute(year) {
    const [cycleRows, readingDays, availableYears, sessionPagesByMonth] =
      await Promise.all([
        this.readingStatsRepository.getFinishedCyclesByYear(year),
        this.readingStatsRepository.getReadingDaysInFinishedCycles(year),
        this.readingStatsRepository.getFinishedCycleYears(),
        this.readingStatsRepository.getMonthlyReadingActivity(year),
      ]);

    const cycles = cycleRows.map((row) =>
      ReadingCycleSummary.fromDatabase(row),
    );

    const summary = new AnnualReadingSummary({
      year,
      cycles,
      readingDays: readingDays.length,
      sessionPagesByMonth,
    });

    return {
      available_years: availableYears,
      ...summary.toJSON(),
    };
  }
}
