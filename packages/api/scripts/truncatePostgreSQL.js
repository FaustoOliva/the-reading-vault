#!/usr/bin/env node
/**
 * Truncate all tables in PostgreSQL for clean migration
 * 
 * Usage:
 *   node scripts/truncatePostgreSQL.js
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

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

const pgPool = new pg.Pool(POSTGRESQL_CONFIG);

async function truncateAllTables() {
  try {
    console.log("[INFO] Connecting to PostgreSQL...");
    const client = await pgPool.connect();

    const tables = [
      "ReadingSessions",
      "BookStatusHistory",
      "Books",
      "Authors",
      "Countries",
      "ReaderProfiles",
    ];

    console.log("[INFO] Truncating tables...\n");

    for (const table of tables) {
      try {
        await client.query(`TRUNCATE TABLE ${table} CASCADE`);
        console.log(`[✓] Truncated ${table}`);
      } catch (error) {
        console.log(`[⚠] Table ${table} does not exist or error: ${error.message}`);
      }
    }

    console.log("\n[INFO] Resetting sequences...");

    const sequences = [
      "Countries",
      "Authors",
      "Books",
      "BookStatusHistory",
      "ReadingSessions",
    ];

    for (const seq of sequences) {
      try {
        await client.query(
          `SELECT setval(pg_get_serial_sequence('${seq}', 'id'), 1)`
        );
        console.log(`[✓] Reset sequence for ${seq}`);
      } catch (error) {
        console.log(`[⚠] Could not reset ${seq}: ${error.message}`);
      }
    }

    client.release();
    await pgPool.end();

    console.log("\n[✓] PostgreSQL tables truncated successfully!");
    process.exit(0);
  } catch (error) {
    console.error(`[✗] Error: ${error.message}`);
    await pgPool.end();
    process.exit(1);
  }
}

truncateAllTables();
