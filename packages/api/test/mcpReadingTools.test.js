import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerReadingTools } from "../infraestructure/mcp/readingTools.js";
import { NotFoundError } from "../errors/index.js";

function createFakeServer() {
  const tools = new Map();

  return {
    tools,
    registerTool(name, config, handler) {
      tools.set(name, { config, handler });
    },
  };
}

describe("registerReadingTools", () => {
  let server;
  let getBooksService;
  let getBookByIdService;
  let createBookService;
  let logReadingSessionService;

  beforeEach(() => {
    server = createFakeServer();

    getBooksService = { execute: vi.fn() };
    getBookByIdService = { execute: vi.fn() };
    createBookService = { execute: vi.fn() };
    logReadingSessionService = { execute: vi.fn() };

    registerReadingTools(server, {
      getBooksService,
      getBookByIdService,
      createBookService,
      logReadingSessionService,
    });
  });

  it("registers the narrow reading tool surface", () => {
    expect(Array.from(server.tools.keys()).sort()).toEqual([
      "create_book",
      "get_book_reading_progress",
      "log_reading_session",
      "search_books",
    ]);
  });

  it("searches books through GetBooksService with a bounded limit", async () => {
    getBooksService.execute.mockResolvedValue({
      total: 1,
      books: [
        {
          id: 4,
          title: "El túnel",
          authorName: "Ernesto Sabato",
          status: "READING",
          totalPages: 160,
          currentReadingCycle: 1,
          score: null,
        },
      ],
    });

    const result = await server.tools.get("search_books").handler({
      query: "sabato",
    });

    expect(getBooksService.execute).toHaveBeenCalledWith(
      { titleSearch: "sabato" },
      { page: 1, limit: 10 },
    );
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      total: 1,
      returned: 1,
      books: [{ id: 4, title: "El túnel", author: "Ernesto Sabato" }],
    });
  });

  it("reports cumulative current-cycle progress through GetBookByIdService", async () => {
    getBookByIdService.execute.mockResolvedValue({
      book: {
        id: 1082,
        title: "El ojo de Goliat",
        status: "READING",
        total_pages: 145,
        current_reading_cycle: 1,
        pages_read_in_current_cycle: 43,
      },
    });

    const result = await server.tools.get("get_book_reading_progress").handler({
      bookId: 1082,
    });
    const payload = JSON.parse(result.content[0].text);

    expect(getBookByIdService.execute).toHaveBeenCalledWith(1082);
    expect(payload.book).toEqual({
      id: 1082,
      title: "El ojo de Goliat",
      status: "READING",
      totalPages: 145,
      currentReadingCycle: 1,
      pagesReadInCurrentCycle: 43,
    });
    expect(payload.hint).toContain("cumulative");
  });

  it("reports reading-progress application errors as tool errors", async () => {
    getBookByIdService.execute.mockRejectedValue(
      new NotFoundError("Book", 999),
    );

    const result = await server.tools.get("get_book_reading_progress").handler({
      bookId: 999,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Book");
  });

  it("creates a book through CreateBookService", async () => {
    createBookService.execute.mockResolvedValue({
      toJSON: () => ({ id: 9, title: "Ficciones", status: "WISH_LIST" }),
    });

    const result = await server.tools.get("create_book").handler({
      title: "Ficciones",
      author: { name: "Jorge Luis Borges" },
    });

    expect(createBookService.execute).toHaveBeenCalledWith({
      title: "Ficciones",
      author: { name: "Jorge Luis Borges" },
    });
    expect(JSON.parse(result.content[0].text)).toEqual({
      book: { id: 9, title: "Ficciones", status: "WISH_LIST" },
    });
  });

  it("rejects a final status without a score before calling the service", async () => {
    const result = await server.tools.get("create_book").handler({
      title: "Historical import",
      author: { name: "Someone" },
      status: "COMPLETED",
    });

    expect(result.isError).toBe(true);
    expect(createBookService.execute).not.toHaveBeenCalled();
  });

  it("logs a session and converts the occurredAt string to a Date", async () => {
    logReadingSessionService.execute.mockResolvedValue({
      toJSON: () => ({ id: 31, bookId: 4, pagesRead: 20, readingCycle: 1 }),
    });

    const result = await server.tools.get("log_reading_session").handler({
      bookId: 4,
      pagesRead: 20,
      occurredAt: "2026-04-01T18:30:00.000Z",
    });

    const input = logReadingSessionService.execute.mock.calls[0][0];

    expect(input.bookId).toBe(4);
    expect(input.pagesRead).toBe(20);
    expect(input.occurredAt).toBeInstanceOf(Date);
    expect(JSON.parse(result.content[0].text).session).toMatchObject({
      id: 31,
      bookId: 4,
    });
  });

  it("reports application errors as tool errors", async () => {
    logReadingSessionService.execute.mockRejectedValue(
      new NotFoundError("Book", 404),
    );

    const result = await server.tools.get("log_reading_session").handler({
      bookId: 404,
      pagesRead: 5,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Book");
  });
});
