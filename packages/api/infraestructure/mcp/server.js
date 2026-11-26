/**
 * MCP Server Entry Point (local stdio)
 * Exposes book search, book creation, reading-session logging and
 * reading-progress lookup to a local LLM
 * (for example OpenCode) without launching the React app.
 *
 * Responsibilities:
 * - Bootstrap the existing DI container and database connection
 * - Register the local reading tools
 * - Serve the Model Context Protocol over stdio
 *
 * Rules:
 * - stdout carries only the MCP protocol stream
 * - Diagnostics go to stderr
 * - All work goes through existing use cases; no direct database access here
 */

import "./stdioGuard.js";
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { DIContainer } from "../../config/container.js";
import { config, validateEnv } from "../../config/env.js";
import { registerReadingTools } from "./readingTools.js";

const SERVER_NAME = "the-reading-vault";
const SERVER_VERSION = "1.0.0";

let database = null;
let isShuttingDown = false;

/**
 * Close the database pool once and exit
 * @param exitCode - Process exit code
 */
async function shutdown(exitCode) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (database) {
    try {
      await database.disconnect();
    } catch (error) {
      console.error("MCP shutdown: database disconnect failed:", error.message);
    }
  }

  process.exit(exitCode);
}

async function main() {
  validateEnv();

  const container = new DIContainer();
  container.bootstrap();

  database = container.getDatabase();
  await database.connect();

  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerReadingTools(server, {
    getBooksService: container.getService("getBooksService"),
    getBookByIdService: container.getService("getBookByIdService"),
    createBookService: container.getService("createBookService"),
    logReadingSessionService: container.getService("logReadingSessionService"),
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // The MCP client closes stdin when it disconnects; release the pool then.
  process.stdin.on("end", () => {
    shutdown(0);
  });
  process.stdin.on("close", () => {
    shutdown(0);
  });

  process.on("SIGINT", () => {
    shutdown(0);
  });
  process.on("SIGTERM", () => {
    shutdown(0);
  });

  console.error(
    `The Reading Vault MCP server listening on stdio (database: ${config.database.database})`,
  );
}

main().catch(async (error) => {
  console.error("MCP startup failed:", error.message);
  await shutdown(1);
});
