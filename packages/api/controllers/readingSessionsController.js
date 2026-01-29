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

/**
 * Validation schema for LogReadingSession request body
 */
const logSessionBodySchema = z.object({
  bookId: z.number().int().positive(),
  pagesRead: z.number().int().positive(),
  occurredAt: z.string().datetime().optional()
}).strict();

export class ReadingSessionsController {
  constructor(logReadingSessionService) {
    this.logReadingSessionService = logReadingSessionService;
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
        occurredAt: validated.occurredAt ? new Date(validated.occurredAt) : undefined
      };

      // Execute use case
      const session = await this.logReadingSessionService.execute(input);

      // Return created resource
      res.status(201).json({
        success: true,
        data: session.toJSON()
      });
    } catch (error) {
      // Forward to global error middleware
      next(error);
    }
  }
}
