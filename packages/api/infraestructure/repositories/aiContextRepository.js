/**
 * AIContextRepository
 * Handles reader profile aggregation and persistence for AI services
 *
 * Responsibilities:
 * - Calculate reader profile from aggregated book/author data
 * - Store and retrieve reader profile (singleton)
 * - Detect semantically relevant changes (e.g., top authors changed)
 *
 * Rules:
 * - All calculation methods are read-only (no transactions needed)
 * - Only saveReaderProfile() writes to database
 * - Returns plain objects, not domain entities
 * - Profile is a computed value object, not a persistent entity
 *
 * Phase: Metadata-enriched profile
 * - Aggregations include score behavior, metadata distributions, and anti-signals
 */

import sql from "mssql";

export class AIContextRepository {
  constructor(mssqlClient, bookRepository) {
    this.mssqlClient = mssqlClient;
    this.bookRepository = bookRepository;
  }

  /**
   * Get current reader profile from database
   * @returns {Promise<Object|null>} Profile object or null if not exists
   */
  async getReaderProfile() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT 
        id,
        version,
        schema_version,
        profile_data,
        semantic_summary,
        last_updated,
        last_refresh_reason,
        tokens_used,
        important_event_pending
      FROM ReaderProfiles
      WHERE id = 1
    `;

    const result = await pool.request().query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    const record = result.recordset[0];

    return {
      id: record.id,
      version: record.version,
      schemaVersion: record.schema_version,
      profileData: JSON.parse(record.profile_data),
      semanticSummary: record.semantic_summary,
      lastUpdated: record.last_updated,
      lastRefreshReason: record.last_refresh_reason,
      tokensUsed: record.tokens_used,
      importantEventPending: Boolean(record.important_event_pending),
    };
  }

  /**
   * Save reader profile to database (UPSERT)
   * @param {number} version - Profile version (incremented on each refresh)
   * @param {number} schemaVersion - Schema version (1=legacy, 2=metadata-enriched)
   * @param {Object} profileData - Structured profile data
   * @param {string|null} semanticSummary - OpenAI-generated summary
   * @param {string} reason - Reason for refresh
   * @param {number|null} tokensUsed - OpenAI tokens consumed
   * @returns {Promise<void>}
   */
  async saveReaderProfile(
    version,
    schemaVersion,
    profileData,
    semanticSummary,
    reason,
    tokensUsed,
    importantEventPending = false,
  ) {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      MERGE ReaderProfiles AS target
      USING (SELECT 1 AS id) AS source
      ON target.id = source.id
      WHEN MATCHED THEN
        UPDATE SET
          version = @version,
          schema_version = @schemaVersion,
          profile_data = @profileData,
          semantic_summary = @semanticSummary,
          last_updated = GETDATE(),
          last_refresh_reason = @reason,
          tokens_used = @tokensUsed,
          important_event_pending = @importantEventPending
      WHEN NOT MATCHED THEN
        INSERT (id, version, schema_version, profile_data, semantic_summary, last_updated, last_refresh_reason, tokens_used, important_event_pending)
        VALUES (1, @version, @schemaVersion, @profileData, @semanticSummary, GETDATE(), @reason, @tokensUsed, @importantEventPending);
    `;

    await pool
      .request()
      .input("version", sql.Int, version)
      .input("schemaVersion", sql.Int, schemaVersion)
      .input("profileData", sql.NVarChar(sql.MAX), JSON.stringify(profileData))
      .input("semanticSummary", sql.NVarChar(sql.MAX), semanticSummary || null)
      .input("reason", sql.NVarChar(100), reason)
      .input("tokensUsed", sql.Int, tokensUsed || null)
      .input("importantEventPending", sql.Bit, importantEventPending)
      .query(query);
  }

  /**
   * Count books that satisfy the minimum requirement for profile availability.
   * Requirement: COMPLETED + ABANDONED >= 5
   * @returns {Promise<number>}
   */
  async countBooksForProfileRequirement() {
    const kpis = await this.bookRepository.calculateGlobalKPIs();
    return (kpis.completed || 0) + (kpis.abandoned || 0);
  }

  /**
   * Mark that a semantically important event happened after last profile refresh.
   * This is only meaningful if profile already exists.
   * @returns {Promise<boolean>} True when profile was marked, false when profile does not exist.
   */
  async markImportantEventPending() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      UPDATE ReaderProfiles
      SET important_event_pending = 1
      WHERE id = 1
    `;

    const result = await pool.request().query(query);
    return (result.rowsAffected?.[0] || 0) > 0;
  }

  /**
   * Calculate complete reader profile from database
   * Orchestrates all aggregation methods
   * @returns {Promise<Object>} Complete profile data (schema v2)
   */
  async calculateReaderProfile() {
    // Execute all aggregations in parallel for performance
    const [
      statistics,
      topAuthors,
      topCountries,
      favoriteBooks,
      lowRatedBooks,
      abandonedBooks,
      topGenres,
      topBookTypes,
      publicationYears,
      pageCounts,
    ] = await Promise.all([
      this._calculateStatistics(),
      this._calculateTopAuthors(),
      this._calculateTopCountries(),
      this._calculateFavoriteBooks(),
      this._calculateLowRatedBooks(),
      this._calculateAbandonedBooks(),
      this._calculateTopGenres(),
      this._calculateTopBookTypes(),
      this._calculatePublicationYearDistribution(),
      this._calculatePageCountDistribution(),
    ]);

    // Assemble complete profile structure
    return {
      schemaVersion: 2, // Complete metadata-enriched profile
      version: 0, // Will be set by service when saving
      statistics,
      topAuthors,
      topRatedBooks: favoriteBooks,
      lowRatedBooks,
      distributions: {
        genres: topGenres,
        countries: topCountries,
        years: publicationYears,
        pages: pageCounts,
        formats: topBookTypes,
      },
      metadataSignals: {
        synopsisThemes: [],
      },
      abandonedBooks,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate global statistics
   * Reuses existing bookRepository.calculateGlobalKPIs()
   * @private
   * @returns {Promise<Object>} Statistics object
   */
  async _calculateStatistics() {
    const kpis = await this.bookRepository.calculateGlobalKPIs();

    // Transform to profile statistics structure
    return {
      totalBooks: kpis.total,
      completedBooks: kpis.completed,
      readingBooks: kpis.reading,
      abandonedBooks: kpis.abandoned,
      wishlistBooks: kpis.wishList,
      completionRate:
        kpis.total > 0
          ? parseFloat(((kpis.completed / kpis.total) * 100).toFixed(2))
          : 0,
      booksRated: kpis.booksRated,
      avgScore: kpis.avgScore ? parseFloat(kpis.avgScore.toFixed(2)) : null,
    };
  }

  /**
   * Calculate top 5 authors by book count (simple COUNT, no affinity)
   * MVP: Simple count-based ranking
   * Phase 2: Will add affinity formula (completed*2 + reading) - (abandoned*1.5)
   * @private
   * @returns {Promise<Array>} Top 5 authors with book counts and average scores
   */
  async _calculateTopAuthors() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT TOP 5
        a.name,
        c.name as nationality,
        COUNT(*) as bookCount,
        AVG(CASE WHEN b.score IS NOT NULL THEN b.score ELSE NULL END) as avgScore
      FROM Books b
      INNER JOIN Authors a ON b.author_id = a.id
      LEFT JOIN Countries c ON a.nationality_id = c.id
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      WHERE bs.internal_code IN ('COMPLETED', 'READING', 'ABANDONED')
      GROUP BY a.name, c.name
      ORDER BY bookCount DESC, avgScore DESC
    `;

    const result = await pool.request().query(query);

    return result.recordset.map((record) => ({
      name: record.name,
      nationality: record.nationality || "Unknown",
      bookCount: record.bookCount,
      avgScore: record.avgScore ? parseFloat(record.avgScore.toFixed(2)) : null,
    }));
  }

  /**
   * Calculate top 3 countries by author nationality
   * @private
   * @returns {Promise<Array>} Top 3 countries with book counts
   */
  async _calculateTopCountries() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT TOP 3
        c.name,
        COUNT(*) as bookCount
      FROM Books b
      INNER JOIN Authors a ON b.author_id = a.id
      INNER JOIN Countries c ON a.nationality_id = c.id
      WHERE c.name IS NOT NULL
      GROUP BY c.name
      ORDER BY bookCount DESC
    `;

    const result = await pool.request().query(query);

    return result.recordset.map((record) => ({
      name: record.name,
      bookCount: record.bookCount,
    }));
  }

  /**
   * Get favorite books (score >= 8)
   * @private
   * @returns {Promise<Array>} Favorite books with title, author, and score
   */
  async _calculateFavoriteBooks() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT TOP 15
        b.title,
        a.name as author,
        b.score
      FROM Books b
      INNER JOIN Authors a ON b.author_id = a.id
      WHERE b.score >= 8
      ORDER BY b.score DESC, b.title ASC
    `;

    const result = await pool.request().query(query);

    return result.recordset.map((record) => ({
      title: record.title,
      author: record.author,
      score:
        record.score !== null && record.score !== undefined
          ? parseFloat(record.score.toFixed(1))
          : null,
    }));
  }

  /**
   * Get abandoned books for anti-recommendations
   * @private
   * @returns {Promise<Array>} Abandoned books with title, author, and nationality
   */
  async _calculateAbandonedBooks() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT TOP 15
        b.title,
        a.name as author,
        c.name as nationality
      FROM Books b
      INNER JOIN Authors a ON b.author_id = a.id
      LEFT JOIN Countries c ON a.nationality_id = c.id
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      WHERE bs.internal_code = 'ABANDONED'
      ORDER BY b.title ASC
    `;

    const result = await pool.request().query(query);

    return result.recordset.map((record) => ({
      title: record.title,
      author: record.author,
      nationality: record.nationality || "Unknown",
    }));
  }

  /**
   * Get low-rated books (score <= 4)
   * @private
   * @returns {Promise<Array>} Low-rated books with title, author, and score
   */
  async _calculateLowRatedBooks() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT TOP 15
        b.title,
        a.name as author,
        b.score
      FROM Books b
      INNER JOIN Authors a ON b.author_id = a.id
      WHERE b.score IS NOT NULL AND b.score <= 4
      ORDER BY b.score ASC, b.title ASC
    `;

    const result = await pool.request().query(query);

    return result.recordset.map((record) => ({
      title: record.title,
      author: record.author,
      score:
        record.score !== null && record.score !== undefined
          ? parseFloat(record.score.toFixed(1))
          : null,
    }));
  }

  /**
   * Calculate top genres by frequency
   * @private
   * @returns {Promise<Array>} Top genres with counts
   */
  async _calculateTopGenres() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT TOP 5
        g.name,
        COUNT(*) as count
      FROM Books b
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      INNER JOIN BookGenres bg ON b.id = bg.book_id
      INNER JOIN Genres g ON g.id = bg.genre_id
      WHERE bs.internal_code IN ('COMPLETED', 'READING', 'ABANDONED')
      GROUP BY g.name
      ORDER BY count DESC, g.name ASC
    `;

    const result = await pool.request().query(query);

    return result.recordset.map((record) => ({
      name: record.name,
      count: record.count,
    }));
  }

  /**
   * Calculate top editorial book types (used as format proxy)
   * @private
   * @returns {Promise<Array>} Top editorial types with counts
   */
  async _calculateTopBookTypes() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT TOP 5
        bt.name,
        COUNT(*) as count
      FROM Books b
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      INNER JOIN BookTypes bt ON b.book_type_id = bt.id
      WHERE bs.internal_code IN ('COMPLETED', 'READING', 'ABANDONED')
      GROUP BY bt.name
      ORDER BY count DESC, bt.name ASC
    `;

    const result = await pool.request().query(query);

    return result.recordset.map((record) => ({
      name: record.name,
      count: record.count,
    }));
  }

  /**
   * Calculate publication year distribution
   * @private
   * @returns {Promise<Object>} Year stats with average and range
   */
  async _calculatePublicationYearDistribution() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT
        AVG(CAST(b.publication_year AS FLOAT)) as avg,
        MIN(b.publication_year) as min,
        MAX(b.publication_year) as max
      FROM Books b
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      WHERE bs.internal_code IN ('COMPLETED', 'READING', 'ABANDONED')
        AND b.publication_year IS NOT NULL
    `;

    const result = await pool.request().query(query);
    const record = result.recordset[0] || {};

    return {
      average:
        record.avg !== null && record.avg !== undefined
          ? parseFloat(record.avg.toFixed(1))
          : null,
      min: record.min || null,
      max: record.max || null,
    };
  }

  /**
   * Calculate page-count distribution
   * @private
   * @returns {Promise<Object>} Page stats with average and range
   */
  async _calculatePageCountDistribution() {
    const pool = await this.mssqlClient.getConnection();

    const query = `
      SELECT
        AVG(CAST(b.total_pages AS FLOAT)) as avg,
        MIN(b.total_pages) as min,
        MAX(b.total_pages) as max
      FROM Books b
      INNER JOIN BookStatuses bs ON b.status_id = bs.id
      WHERE bs.internal_code IN ('COMPLETED', 'READING', 'ABANDONED')
        AND b.total_pages IS NOT NULL
    `;

    const result = await pool.request().query(query);
    const record = result.recordset[0] || {};

    return {
      average:
        record.avg !== null && record.avg !== undefined
          ? parseFloat(record.avg.toFixed(1))
          : null,
      min: record.min || null,
      max: record.max || null,
    };
  }

  /**
   * Refresh reader profile with new data and semantic summary
   * Increments version and saves to database
   * @param {string} reason - Reason for refresh
   * @param {string|null} semanticSummary - OpenAI-generated summary
   * @param {number|null} tokensUsed - OpenAI tokens consumed
   * @returns {Promise<Object>} Saved profile with version
   */
  async refreshReaderProfile(
    reason,
    semanticSummary = null,
    tokensUsed = null,
  ) {
    // Get current profile for version tracking
    const currentProfile = await this.getReaderProfile();
    const newVersion = currentProfile ? currentProfile.version + 1 : 1;

    // Calculate new profile data
    const profileData = await this.calculateReaderProfile();

    // Save profile
    await this.saveReaderProfile(
      newVersion,
      2, // schemaVersion = 2 (metadata-enriched profile)
      profileData,
      semanticSummary,
      reason,
      tokensUsed,
      false,
    );

    return {
      version: newVersion,
      profileData,
      semanticSummary,
      tokensUsed,
    };
  }
}
