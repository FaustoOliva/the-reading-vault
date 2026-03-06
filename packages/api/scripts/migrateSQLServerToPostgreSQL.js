#!/usr/bin/env node
/**
 * SQL Server to PostgreSQL Data Migration Script
 * 
 * Migrates all data from SQL Server to PostgreSQL following the correct
 * foreign key order: countries → authors → books → book_status_history → 
 * reading_sessions → reader_profile
 * 
 * Usage:
 *   node scripts/migrateSQLServerToPostgreSQL.js
 * 
 * Prerequisites:
 *   - .env configured with both MSSQL_* and DB_* variables
 *   - PostgreSQL database initialized with schema (init-postgres.sql)
 *   - SQL Server database accessible
 */

import sql from "mssql";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// CONFIGURATION
// ============================================================================

const MSSQL_CONFIG = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_HOST,
  port: parseInt(process.env.MSSQL_PORT || "1433", 10),
  database: process.env.MSSQL_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 15000,
  },
};

const POSTGRESQL_CONFIG = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false, // Aiven requires SSL
  },
};

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  success: (msg) => console.log(`[✓] ${msg}`),
  warn: (msg) => console.log(`[⚠] ${msg}`),
  error: (msg) => console.error(`[✗] ${msg}`),
  table: (title, data) => {
    console.log(`\n${title}:`);
    console.table(data);
  },
};

// ============================================================================
// DATABASE CONNECTIONS
// ============================================================================

let mssqlPool = null;
let pgPool = null;

async function connectMSSQL() {
  try {
    log.info("Connecting to SQL Server...");
    mssqlPool = new sql.ConnectionPool(MSSQL_CONFIG);
    await mssqlPool.connect();
    log.success("Connected to SQL Server");
    return mssqlPool;
  } catch (error) {
    log.error(`Failed to connect to SQL Server: ${error.message}`);
    throw error;
  }
}

async function connectPostgreSQL() {
  try {
    log.info("Connecting to PostgreSQL...");
    pgPool = new pg.Pool(POSTGRESQL_CONFIG);
    const client = await pgPool.connect();
    client.release();
    log.success("Connected to PostgreSQL");
    return pgPool;
  } catch (error) {
    log.error(`Failed to connect to PostgreSQL: ${error.message}`);
    throw error;
  }
}

async function closeConnections() {
  if (mssqlPool) {
    try {
      await mssqlPool.close();
      log.info("Closed SQL Server connection");
    } catch (error) {
      log.warn(`Error closing SQL Server: ${error.message}`);
    }
  }

  if (pgPool) {
    try {
      await pgPool.end();
      log.info("Closed PostgreSQL connection");
    } catch (error) {
      log.warn(`Error closing PostgreSQL: ${error.message}`);
    }
  }
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Migrate countries (no dependencies)
 */
async function migrateCountries() {
  log.info("\n--- Migrating Countries ---");
}

/**
 * Migrate authors (depends on countries)
 */
async function migrateAuthors() {
  log.info("\n--- Migrating Authors ---");

  try {
    // Read from SQL Server
    const mssqlResult = await mssqlPool.request().query("SELECT * FROM Authors");
    const authors = mssqlResult.recordset;
    log.info(`Found ${authors.length} authors in SQL Server`);

    if (authors.length === 0) {
      log.warn("No authors to migrate");
      return 0;
    }

    // Truncate PostgreSQL table
    await pgPool.query("TRUNCATE TABLE Authors CASCADE");
    log.info("Cleared PostgreSQL Authors table");

    // Insert into PostgreSQL
    let inserted = 0;
    for (const author of authors) {
      await pgPool.query(
        "INSERT INTO authors (id, name, nationality_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, nationality_id = $3",
        [author.id, author.name, author.countryId]
      );
      inserted++;
    }

    // Reset sequence
    await pgPool.query(
      "SELECT setval(pg_get_serial_sequence('Authors', 'id'), (SELECT COALESCE(MAX(id), 0) FROM Authors) + 1)"
    );

    log.success(`Migrated ${inserted} authors`);
    return inserted;
  } catch (error) {
    log.error(`Failed to migrate authors: ${error.message}`);
    throw error;
  }
}

/**
 * Migrate books (depends on authors)
 */
async function migrateBooks() {
  log.info("\n--- Migrating Books ---");

  try {
    // Read from SQL Server
    const mssqlResult = await mssqlPool.request().query("SELECT * FROM Books");
    const books = mssqlResult.recordset;
    log.info(`Found ${books.length} books in SQL Server`);

    if (books.length === 0) {
      log.warn("No books to migrate");
      return 0;
    }

    // Truncate PostgreSQL table
    await pgPool.query("TRUNCATE TABLE Books CASCADE");
    log.info("Cleared PostgreSQL Books table");

    // Insert into PostgreSQL
    let inserted = 0;
    // Map status string to status_id (1=WISH_LIST, 2=READING, 3=PENDING_SCORE, 4=COMPLETED, 5=ABANDONED)
    const statusMap = {'WISH_LIST': 1, 'READING': 2, 'PENDING_SCORE': 3, 'COMPLETED': 4, 'ABANDONED': 5};
    
    for (const book of books) {
      const statusId = statusMap[book.status] || 1;
      
      await pgPool.query(
        `INSERT INTO Books (
          id, title, author_id, status_id, score, total_pages, 
          isbn, comment, current_reading_cycle
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET 
          title = $2, author_id = $3, status_id = $4, score = $5,
          total_pages = $6, isbn = $7, comment = $8, current_reading_cycle = $9`,
        [
          book.id,
          book.title,
          book.author_id,
          statusId,
          book.score,
          book.totalPages,
          book.isbn || null,
          book.comment || null,
          1,
        ]
      );
      inserted++;
    }

    // Reset sequence
    await pgPool.query(
      "SELECT setval(pg_get_serial_sequence('Books', 'id'), (SELECT COALESCE(MAX(id), 0) FROM Books) + 1)"
    );

    log.success(`Migrated ${inserted} books`);
    return inserted;
  } catch (error) {
    log.error(`Failed to migrate books: ${error.message}`);
    throw error;
  }
}

/**
 * Migrate book status history (depends on books)
 */
async function migrateBookStatusHistory() {
  log.info("\n--- Migrating Book Status History ---");

  try {
    // Read from SQL Server
    const mssqlResult = await mssqlPool
      .request()
      .query("SELECT * FROM BookStatusHistory");
    const history = mssqlResult.recordset;
    log.info(`Found ${history.length} status history records in SQL Server`);

    if (history.length === 0) {
      log.warn("No status history to migrate");
      return 0;
    }

    // Truncate PostgreSQL table
    await pgPool.query("TRUNCATE TABLE BookStatusHistory CASCADE");
    log.info("Cleared PostgreSQL BookStatusHistory table");

    // Insert into PostgreSQL
    let inserted = 0;
    const statusMap = {'WISH_LIST': 1, 'READING': 2, 'PENDING_SCORE': 3, 'COMPLETED': 4, 'ABANDONED': 5};
    for (const record of history) {
      const oldStatusId = record.oldStatus ? statusMap[record.oldStatus] : null;
      const newStatusId = statusMap[record.newStatus] || 1;
      
      await pgPool.query(
        `INSERT INTO BookStatusHistory (
          id, book_id, old_status_id, new_status_id, reading_cycle, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET 
          old_status_id = $3, new_status_id = $4, reading_cycle = $5`,
        [record.id, record.bookId, oldStatusId, newStatusId, 1, record.createdAt]
      );
      inserted++;
    }

    // Reset sequence
    await pgPool.query(
      "SELECT setval(pg_get_serial_sequence('BookStatusHistory', 'id'), (SELECT COALESCE(MAX(id), 0) FROM BookStatusHistory) + 1)"
    );

    log.success(`Migrated ${inserted} status history records`);
    return inserted;
  } catch (error) {
    log.error(`Failed to migrate book status history: ${error.message}`);
    throw error;
  }
}

/**
 * Migrate reading sessions (depends on books)
 */
async function migrateReadingSessions() {
  log.info("\n--- Migrating Reading Sessions ---");

  try {
    // Read from SQL Server
    const mssqlResult = await mssqlPool
      .request()
      .query("SELECT * FROM ReadingSessions");
    const sessions = mssqlResult.recordset;
    log.info(`Found ${sessions.length} reading sessions in SQL Server`);

    if (sessions.length === 0) {
      log.warn("No reading sessions to migrate");
      return 0;
    }

    // Truncate PostgreSQL table
    await pgPool.query("TRUNCATE TABLE ReadingSessions CASCADE");
    log.info("Cleared PostgreSQL ReadingSessions table");

    // Insert into PostgreSQL
    let inserted = 0;
    for (const session of sessions) {
      await pgPool.query(
        `INSERT INTO ReadingSessions (
          id, book_id, pages_read, occurred_at, reading_cycle, duration, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET 
          pages_read = $3, occurred_at = $4, duration = $6`,
        [
          session.id,
          session.bookId,
          session.pagesRead,
          session.startedAt || session.createdAt,
          1,
          session.duration || null,
          session.createdAt,
        ]
      );
      inserted++;
    }

    // Reset sequence
    await pgPool.query(
      "SELECT setval(pg_get_serial_sequence('ReadingSessions', 'id'), (SELECT COALESCE(MAX(id), 0) FROM ReadingSessions) + 1)"
    );

    log.success(`Migrated ${inserted} reading sessions`);
    return inserted;
  } catch (error) {
    log.error(`Failed to migrate reading sessions: ${error.message}`);
    throw error;
  }
}

/**
 * Migrate reader profile (singleton)
 */
async function migrateReaderProfile() {
  log.info("\n--- Migrating Reader Profile ---");

  try {
    // Check if table exists first
    const tableCheck = await pgPool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ReaderProfiles')"
    );

    if (!tableCheck.rows[0].exists) {
      log.warn("ReaderProfiles table does not exist, skipping");
      return 0;
    }

    // Read from SQL Server (if exists)
    let profiles = [];
    try {
      const mssqlResult = await mssqlPool
        .request()
        .query("SELECT * FROM ReaderProfile");
      profiles = mssqlResult.recordset;
    } catch {
      log.warn("Reader profile table does not exist in SQL Server, will create fresh");
    }

    if (profiles.length === 0) {
      log.warn("No reader profile data to migrate");
      return 0;
    }

    // Truncate PostgreSQL table
    await pgPool.query("TRUNCATE TABLE ReaderProfiles CASCADE");
    log.info("Cleared PostgreSQL ReaderProfiles table");

    // Insert into PostgreSQL
    let inserted = 0;
    for (const profile of profiles) {
      // Convert profile data to JSON structure expected by ReaderProfiles.profile_data
      const profileData = JSON.stringify({
        topAuthors: profile.topAuthors || [],
        topCountries: profile.topCountries || [],
        favoriteBooks: profile.favoriteBooks || [],
        abandonedBooks: profile.abandonedBooks || [],
        readingStats: profile.readingStats || {}
      });

      await pgPool.query(
        `INSERT INTO ReaderProfiles (
          id, version, schema_version, profile_data, last_updated
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET 
          version = $2, profile_data = $4, last_updated = $5`,
        [
          1,
          profile.version || 1,
          1,
          profileData,
          profile.updatedAt || new Date(),
        ]
      );
      inserted++;
    }

    log.success(`Migrated ${inserted} reader profile records`);
    return inserted;
  } catch (error) {
    log.error(`Failed to migrate reader profile: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// VALIDATION & REPORTING
// ============================================================================

async function validateMigration() {
  log.info("\n--- Validating Migration ---\n");

  const tables = [
    "Countries",
    "Authors",
    "Books",
    "BookStatusHistory",
    "ReadingSessions",
    "ReaderProfiles",
  ];

  const results = {};
  for (const table of tables) {
    try {
      const result = await pgPool.query(`SELECT COUNT(*) as count FROM ${table}`);
      results[table] = parseInt(result.rows[0].count, 10);
    } catch (error) {
      results[table] = 0;
    }
  }

  log.table("PostgreSQL Record Counts", results);
  return results;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runMigration() {
  const startTime = Date.now();
  const stats = {};

  try {
    log.info("========================================");
    log.info("SQL Server → PostgreSQL Migration");
    log.info("========================================\n");

    // Validate configuration
    if (!MSSQL_CONFIG.password || !POSTGRESQL_CONFIG.password) {
      throw new Error(
        "Missing credentials. Ensure MSSQL_* and DB_* variables are set in .env"
      );
    }

    // Connect to both databases
    await connectMSSQL();
    await connectPostgreSQL();

    // Run migrations in order (respecting foreign key dependencies)
    stats.countries = await migrateCountries();
    stats.authors = await migrateAuthors();
    stats.books = await migrateBooks();
    stats.bookStatusHistory = await migrateBookStatusHistory();
    stats.readingSessions = await migrateReadingSessions();
    stats.readerProfile = await migrateReaderProfile();

    // Validate
    const counts = await validateMigration();

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log.info("\n========================================");
    log.success("Migration completed successfully!");
    log.info(`Total time: ${duration}s`);
    log.info("========================================\n");

    return true;
  } catch (error) {
    log.error(`\nMigration failed: ${error.message}`);
    log.error("Stack:", error.stack);
    return false;
  } finally {
    await closeConnections();
  }
}

// Execute
const success = await runMigration();
process.exit(success ? 0 : 1);
