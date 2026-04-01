/**
 * ReadingSessionsController
 * Handles HTTP requests for reading session operations
 *
 * Responsibilities:
 * - Validate input using Zod
 * - Call services
 * - Format HTTP responses
 * - Forward errors to global middleware
 *
 * Rules:
 * - No business logic
 * - Validation only happens here
 * - No domain error creation
 */

import { z } from "zod";
import { logSessionBaseSchema } from "@reading-vault/common";
import { forBodyParams } from "../adapters/zodAdapters.js";

/**
 * Validation schema for LogReadingSession request body
 */
const logSessionBodySchema = forBodyParams(
  logSessionBaseSchema.extend({
    occurredAt: z.string().datetime().optional(),
  }),
);

export class ReadingSessionsController {
  constructor(logReadingSessionService, getRecentReadingSessionService) {
    this.logReadingSessionService = logReadingSessionService;
    this.getRecentReadingSessionService = getRecentReadingSessionService;
  }

  /**
   * POST /reading-sessions
   * Logs a new reading session for a book
   */
  async logSession(req, res, next) {
    try {
      // Validate request body
      const validated = logSessionBodySchema.parse(req.body);

      // Convert occurredAt string to Date if provided
      const input = {
        ...validated,
        occurredAt: validated.occurredAt
          ? new Date(validated.occurredAt)
          : undefined,
      };

      // Execute use case
      const session = await this.logReadingSessionService.execute(input);

      // Return created resource
      res.status(201).json({
        success: true,
        data: session.toJSON(),
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }

  /**
   * GET /reading-sessions/recent
   * Gets the most recent reading session with book information
   */
  async getRecent(req, res, next) {
    try {
      const recent = await this.getRecentReadingSessionService.execute();

      res.status(200).json({
        success: true,
        data: recent,
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }
}
