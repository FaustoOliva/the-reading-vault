/**
 * MCP Reading Tools
 * Local tool surface that lets an LLM manage books and reading sessions
 * without opening the app.
 *
 * Responsibilities:
 * - Validate tool input with Zod at the MCP boundary
 * - Delegate work to existing use cases (services)
 * - Return compact JSON results for the model
 *
 * Rules:
 * - No business logic and no direct database access
 * - No duplicated domain rules: the services and entities own them
 * - One use case per tool
 */

import { z } from "zod";
import {
  BookStatus,
  authorNameSchema,
  bookStatusSchema,
  bookTypeOptionalSchema,
  commentSchema,
  countryNameSchema,
  genresOptionalSchema,
  isbnOptionalSchema,
  pagesOptionalSchema,
  publicationYearOptionalSchema,
  scoreOptionalSchema,
  synopsisOptionalSchema,
  titleSchema,
} from "@reading-vault/common";
import { AppError } from "../../errors/index.js";

const SEARCH_DEFAULT_LIMIT = 10;
const SEARCH_MAX_LIMIT = 20;

const searchBooksInputSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe("Title or author text to search for"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(SEARCH_MAX_LIMIT)
      .optional()
      .describe("Maximum number of matches to return (default 10)"),
  })
  .strict();

const createBookInputSchema = z
  .object({
    title: titleSchema,
    author: z
      .object({
        name: authorNameSchema,
        nationality: countryNameSchema.optional(),
      })
      .strict(),
    isbn: isbnOptionalSchema,
    totalPages: pagesOptionalSchema,
    publicationYear: publicationYearOptionalSchema,
    bookType: bookTypeOptionalSchema,
    genres: genresOptionalSchema,
    synopsis: synopsisOptionalSchema,
    status: bookStatusSchema.optional(),
    score: scoreOptionalSchema,
    comment: commentSchema,
  })
  .strict();

/**
 * Cross-field rule mirrored from the HTTP controller: final statuses need a score
 * @param input - Validated create_book input
 * @returns Error message or null when valid
 */
function validateCreateBookInput(input) {
  if (
    (input.status === BookStatus.COMPLETED ||
      input.status === BookStatus.ABANDONED) &&
    input.score === undefined
  ) {
    return "score is required when creating a book with COMPLETED or ABANDONED status.";
  }

  return null;
}

const getBookReadingProgressInputSchema = z
  .object({
    bookId: z
      .number()
      .int()
      .positive()
      .describe("Book id returned by search_books"),
  })
  .strict();

const logReadingSessionInputSchema = z
  .object({
    bookId: z
      .number()
      .int()
      .positive()
      .describe("Book id returned by search_books"),
    pagesRead: z
      .number()
      .int()
      .positive()
      .describe("Pages read in this session"),
    occurredAt: z
      .string()
      .datetime()
      .optional()
      .describe("ISO 8601 date when the reading happened. Defaults to now."),
  })
  .strict();

/**
 * Build a successful tool result
 * @param payload - Serializable payload
 * @returns {Object} MCP tool result
 */
function toTextResult(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

/**
 * Convert known application errors into tool errors
 * @param toolName - Tool that failed
 * @param error - Thrown value
 * @returns {Object} MCP tool error result
 */
function toToolError(toolName, error) {
  if (error instanceof AppError) {
    return {
      isError: true,
      content: [{ type: "text", text: error.message }],
    };
  }

  console.error(`MCP tool "${toolName}" failed unexpectedly:`, error);

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `The ${toolName} tool failed unexpectedly. Check the server logs.`,
      },
    ],
  };
}

/**
 * Reduce a Book entity to the fields the model needs to act
 * @param book - Book domain entity
 * @returns {Object}
 */
function toBookSummary(book) {
  return {
    id: book.id,
    title: book.title,
    author: book.authorName,
    status: book.status,
    totalPages: book.totalPages,
    currentReadingCycle: book.currentReadingCycle,
    score: book.score,
  };
}

/**
 * Register the local reading tools on an MCP server
 * @param server - McpServer instance
 * @param services - Existing application use cases
 * @param services.getBooksService
 * @param services.getBookByIdService
 * @param services.createBookService
 * @param services.logReadingSessionService
 */
export function registerReadingTools(
  server,
  {
    getBooksService,
    getBookByIdService,
    createBookService,
    logReadingSessionService,
  },
) {
  server.registerTool(
    "search_books",
    {
      description:
        "Search the reading library by book title or author name. Use it to find a book id before logging a reading session, and to check whether a book already exists before creating it.",
      inputSchema: searchBooksInputSchema,
    },
    async ({ query, limit }) => {
      try {
        const result = await getBooksService.execute(
          { titleSearch: query },
          { page: 1, limit: limit ?? SEARCH_DEFAULT_LIMIT },
        );

        return toTextResult({
          total: result.total,
          returned: result.books.length,
          books: result.books.map(toBookSummary),
        });
      } catch (error) {
        return toToolError("search_books", error);
      }
    },
  );

  server.registerTool(
    "get_book_reading_progress",
    {
      description:
        "Read-only progress for a book. Returns pagesReadInCurrentCycle, the cumulative pages already logged in the current reading cycle (not the pages read in a single session). Use it to compute the delta between the current progress and an absolute target page, then pass that delta as pagesRead to log_reading_session. Requires a bookId from search_books.",
      inputSchema: getBookReadingProgressInputSchema,
    },
    async ({ bookId }) => {
      try {
        const result = await getBookByIdService.execute(bookId);

        return toTextResult({
          book: {
            id: result.book.id,
            title: result.book.title,
            status: result.book.status,
            totalPages: result.book.total_pages,
            currentReadingCycle: result.book.current_reading_cycle,
            pagesReadInCurrentCycle: result.book.pages_read_in_current_cycle,
          },
          hint: "pagesReadInCurrentCycle is cumulative for the current cycle. To reach an absolute page, call log_reading_session with the difference as pagesRead.",
        });
      } catch (error) {
        return toToolError("get_book_reading_progress", error);
      }
    },
  );

  server.registerTool(
    "create_book",
    {
      description:
        "Create a book in the reading library. Requires a title and author.name. New books default to WISH_LIST; pass status COMPLETED or ABANDONED only for historical imports, together with a score. Use search_books first to avoid duplicates.",
      inputSchema: createBookInputSchema,
    },
    async (input) => {
      try {
        const validationMessage = validateCreateBookInput(input);

        if (validationMessage) {
          return {
            isError: true,
            content: [{ type: "text", text: validationMessage }],
          };
        }

        const book = await createBookService.execute(input);

        return toTextResult({ book: book.toJSON() });
      } catch (error) {
        return toToolError("create_book", error);
      }
    },
  );

  server.registerTool(
    "log_reading_session",
    {
      description:
        "Log pages read for an existing book. Requires a bookId from search_books. Abandoned books and books waiting for a review reject new sessions.",
      inputSchema: logReadingSessionInputSchema,
    },
    async ({ bookId, pagesRead, occurredAt }) => {
      try {
        const session = await logReadingSessionService.execute({
          bookId,
          pagesRead,
          occurredAt: occurredAt ? new Date(occurredAt) : undefined,
        });

        return toTextResult({
          session: session.toJSON(),
          hint: "If the book reached its last page it now waits for a review in the app before new sessions can be logged.",
        });
      } catch (error) {
        return toToolError("log_reading_session", error);
      }
    },
  );
}
