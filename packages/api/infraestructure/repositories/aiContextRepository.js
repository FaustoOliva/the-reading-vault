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
 * Phase: MVP (Phase 1)
 * - Simple aggregations: top authors by count, favorites, abandoned books
 * - No implicit signals (deferred to Phase 2)
 * - No reading activity from sessions (deferred to Phase 2)
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
        tokens_used
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
    };
  }

  /**
   * Save reader profile to database (UPSERT)
   * @param {number} version - Profile version (incremented on each refresh)
   * @param {number} schemaVersion - Schema version (1=MVP, 2=Complete)
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
          tokens_used = @tokensUsed
      WHEN NOT MATCHED THEN
        INSERT (id, version, schema_version, profile_data, semantic_summary, last_updated, last_refresh_reason, tokens_used)
        VALUES (1, @version, @schemaVersion, @profileData, @semanticSummary, GETDATE(), @reason, @tokensUsed);
    `;

    await pool
      .request()
      .input("version", sql.Int, version)
      .input("schemaVersion", sql.Int, schemaVersion)
      .input("profileData", sql.NVarChar(sql.MAX), JSON.stringify(profileData))
      .input("semanticSummary", sql.NVarChar(sql.MAX), semanticSummary || null)
      .input("reason", sql.NVarChar(100), reason)
      .input("tokensUsed", sql.Int, tokensUsed || null)
      .query(query);
  }

  /**
   * Calculate complete reader profile from database
   * Orchestrates all aggregation methods
   * @returns {Promise<Object>} Complete profile data (MVP structure)
   */
  async calculateReaderProfile() {
    // Execute all aggregations in parallel for performance
    const [
      statistics,
      topAuthors,
      topCountries,
      favoriteBooks,
      abandonedBooks,
    ] = await Promise.all([
      this._calculateStatistics(),
      this._calculateTopAuthors(),
      this._calculateTopCountries(),
      this._calculateFavoriteBooks(),
      this._calculateAbandonedBooks(),
    ]);

    // Assemble MVP profile structure
    return {
      schemaVersion: 1, // MVP
      version: 0, // Will be set by service when saving
      statistics,
      topAuthors,
      topCountries,
      favoriteBooks,
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

    // Transform to MVP profile structure
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
      SELECT 
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
      score: parseFloat(record.score.toFixed(1)),
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
      SELECT 
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
   * Detect if top 3 authors have changed (triggers semantic refresh)
   * @param {Object|null} previousProfile - Previous profile data
   * @param {Object} newProfile - New profile data
   * @returns {boolean} True if top 3 authors changed
   */
  detectTopAuthorsChange(previousProfile, newProfile) {
    if (
      !previousProfile?.topAuthors ||
      previousProfile.topAuthors.length === 0
    ) {
      return true; // First time or empty profile
    }

    const prevTop3 = previousProfile.topAuthors.slice(0, 3).map((a) => a.name);

    const newTop3 = newProfile.topAuthors.slice(0, 3).map((a) => a.name);

    // Check if names match in same order
    return !prevTop3.every((name, idx) => name === newTop3[idx]);
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
      1, // schemaVersion = 1 (MVP)
      profileData,
      semanticSummary,
      reason,
      tokensUsed,
    );

    return {
      version: newVersion,
      profileData,
      semanticSummary,
      tokensUsed,
    };
  }
}
