/**
 * CreateBookService Test Suite
 * Tests for CreateBook use case
 *
 * Pattern: AAA (Arrange-Act-Assert)
 * Target Coverage: ≥ 80%
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConflictError } from "../errors/index.js";
import { BookStatus } from "@reading-vault/common";
import { Book } from "../models/Book.js";

// Mock transaction and request (must be defined before vi.mock)
const mockRequest = {
  input: vi.fn().mockReturnThis(),
  query: vi.fn(),
};

const mockTransaction = {
  begin: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
  request: vi.fn().mockReturnValue(mockRequest),
};

// Mock mssql module (must be hoisted)
vi.mock("mssql", () => ({
  default: {
    Transaction: vi.fn(() => mockTransaction),
    Request: vi.fn(() => mockRequest),
    Int: {},
    NVarChar: {},
  },
}));

// Import service AFTER mocks are set up
import { CreateBookService } from "../services/createBookService.js";

describe("CreateBookService", () => {
  let service;
  let mockMssqlClient;
  let mockBookRepository;
  let mockAuthorRepository;
  let mockCountryRepository;
  let mockBookStatusHistoryRepository;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockRequest.input.mockReturnThis();
    mockRequest.query.mockResolvedValue({ recordset: [{ id: 1 }] });

    // Mock MSSQL client
    mockMssqlClient = {
      getConnection: vi.fn().mockResolvedValue({}),
    };

    // Mock repositories
    mockBookRepository = {
      findByIsbn: vi.fn(),
      create: vi.fn(),
    };

    mockAuthorRepository = {
      findByName: vi.fn(),
      create: vi.fn(),
    };

    mockCountryRepository = {
      findByName: vi.fn(),
      create: vi.fn(),
    };

    mockBookStatusHistoryRepository = {
      create: vi.fn(),
    };

    // Instantiate service
    service = new CreateBookService(
      mockMssqlClient,
      mockBookRepository,
      mockAuthorRepository,
      mockCountryRepository,
      mockBookStatusHistoryRepository,
    );
  });

  describe("✅ Happy Paths", () => {
    it("should pass enriched metadata fields to repository", async () => {
      // Arrange
      const input = {
        title: "The Left Hand of Darkness",
        isbn: "9780441478125",
        totalPages: 304,
        publicationYear: 1969,
        bookType: "Novel",
        genres: ["Science Fiction", "Political Fiction"],
        synopsis:
          "A diplomat navigates politics and identity on a frozen world.",
        author: {
          name: "Ursula K. Le Guin",
        },
      };

      const mockAuthor = {
        id: 20,
        name: "Ursula K. Le Guin",
        nationalityId: null,
      };
      const mockBook = new Book({
        id: 20,
        title: "The Left Hand of Darkness",
        isbn: "9780441478125",
        bookType: "Novel",
        genres: ["Science Fiction", "Political Fiction"],
        synopsis:
          "A diplomat navigates politics and identity on a frozen world.",
        authorId: 20,
        authorName: "Ursula K. Le Guin",
        totalPages: 304,
        publicationYear: 1969,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockBookRepository.findByIsbn.mockResolvedValue(null);
      mockAuthorRepository.findByName.mockResolvedValue(null);
      mockAuthorRepository.create.mockResolvedValue(mockAuthor);
      mockRequest.query.mockResolvedValue({ recordset: [{ id: 1 }] });
      mockBookRepository.create.mockResolvedValue(mockBook);

      // Act
      await service.execute(input);

      // Assert
      expect(mockBookRepository.create).toHaveBeenCalledWith(
        {
          title: "The Left Hand of Darkness",
          isbn: "9780441478125",
          authorId: 20,
          totalPages: 304,
          publicationYear: 1969,
          bookType: "Novel",
          genres: ["Science Fiction", "Political Fiction"],
          synopsis:
            "A diplomat navigates politics and identity on a frozen world.",
          statusId: 1,
        },
        mockTransaction,
      );
    });

    it("should create book with new author and country", async () => {
      // Arrange
      const input = {
        title: "Clean Architecture",
        isbn: "9780134494166",
        totalPages: 432,
        author: {
          name: "Robert C. Martin",
          nationality: "United States",
        },
      };

      const mockCountry = { id: 1, name: "United States" };
      const mockAuthor = { id: 1, name: "Robert C. Martin", nationalityId: 1 };
      const mockBook = new Book({
        id: 1,
        title: "Clean Architecture",
        isbn: "9780134494166",
        authorId: 1,
        authorName: "Robert C. Martin",
        totalPages: 432,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockBookRepository.findByIsbn.mockResolvedValue(null);
      mockCountryRepository.findByName.mockResolvedValue(null);
      mockCountryRepository.create.mockResolvedValue(mockCountry);
      mockAuthorRepository.findByName.mockResolvedValue(null);
      mockAuthorRepository.create.mockResolvedValue(mockAuthor);
      mockRequest.query.mockResolvedValue({ recordset: [{ id: 1 }] }); // WISH_LIST status ID
      mockBookRepository.create.mockResolvedValue(mockBook);
      mockBookStatusHistoryRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockBookRepository.findByIsbn).toHaveBeenCalledWith(
        "9780134494166",
      );
      expect(mockCountryRepository.findByName).toHaveBeenCalledWith(
        "United States",
      );
      expect(mockCountryRepository.create).toHaveBeenCalledWith(
        { name: "United States" },
        mockTransaction,
      );
      expect(mockAuthorRepository.findByName).toHaveBeenCalledWith(
        "Robert C. Martin",
      );
      expect(mockAuthorRepository.create).toHaveBeenCalledWith(
        { name: "Robert C. Martin", nationalityId: 1 },
        mockTransaction,
      );
      expect(mockBookRepository.create).toHaveBeenCalledWith(
        {
          title: "Clean Architecture",
          isbn: "9780134494166",
          authorId: 1,
          totalPages: 432,
          statusId: 1,
        },
        mockTransaction,
      );
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        {
          bookId: 1,
          oldStatus: null,
          newStatus: BookStatus.WISH_LIST,
          readingCycle: 1,
        },
        mockTransaction,
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual(mockBook);
    });

    it("should create book with existing author", async () => {
      // Arrange
      const input = {
        title: "The Clean Coder",
        isbn: "9780137081073",
        totalPages: 256,
        author: {
          name: "Robert C. Martin",
          nationality: "United States",
        },
      };

      const mockCountry = { id: 1, name: "United States" };
      const mockAuthor = { id: 1, name: "Robert C. Martin", nationalityId: 1 };
      const mockBook = new Book({
        id: 2,
        title: "The Clean Coder",
        isbn: "9780137081073",
        authorId: 1,
        authorName: "Robert C. Martin",
        totalPages: 256,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockBookRepository.findByIsbn.mockResolvedValue(null);
      mockCountryRepository.findByName.mockResolvedValue(mockCountry); // Existing country
      mockAuthorRepository.findByName.mockResolvedValue(mockAuthor); // Existing author
      mockRequest.query.mockResolvedValue({ recordset: [{ id: 1 }] });
      mockBookRepository.create.mockResolvedValue(mockBook);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockCountryRepository.create).not.toHaveBeenCalled();
      expect(mockAuthorRepository.create).not.toHaveBeenCalled();
      expect(mockAuthorRepository.findByName).toHaveBeenCalledWith(
        "Robert C. Martin",
      );
      expect(result).toEqual(mockBook);
    });

    it("should create book without nationality", async () => {
      // Arrange
      const input = {
        title: "Domain-Driven Design",
        isbn: "9780321125217",
        totalPages: 560,
        author: {
          name: "Eric Evans",
        },
      };

      const mockAuthor = { id: 2, name: "Eric Evans", nationalityId: null };
      const mockBook = new Book({
        id: 3,
        title: "Domain-Driven Design",
        isbn: "9780321125217",
        authorId: 2,
        authorName: "Eric Evans",
        totalPages: 560,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockBookRepository.findByIsbn.mockResolvedValue(null);
      mockAuthorRepository.findByName.mockResolvedValue(null);
      mockAuthorRepository.create.mockResolvedValue(mockAuthor);
      mockRequest.query.mockResolvedValue({ recordset: [{ id: 1 }] });
      mockBookRepository.create.mockResolvedValue(mockBook);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockCountryRepository.findByName).not.toHaveBeenCalled();
      expect(mockCountryRepository.create).not.toHaveBeenCalled();
      expect(mockAuthorRepository.create).toHaveBeenCalledWith(
        { name: "Eric Evans", nationalityId: null },
        mockTransaction,
      );
      expect(result).toEqual(mockBook);
    });

    it("should create book without ISBN (legacy book)", async () => {
      // Arrange
      const input = {
        title: "Old Programming Book",
        totalPages: 300,
        author: {
          name: "Unknown Author",
        },
      };

      const mockAuthor = { id: 3, name: "Unknown Author", nationalityId: null };
      const mockBook = new Book({
        id: 4,
        title: "Old Programming Book",
        isbn: null,
        authorId: 3,
        authorName: "Unknown Author",
        totalPages: 300,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockAuthorRepository.findByName.mockResolvedValue(null);
      mockAuthorRepository.create.mockResolvedValue(mockAuthor);
      mockRequest.query.mockResolvedValue({ recordset: [{ id: 1 }] });
      mockBookRepository.create.mockResolvedValue(mockBook);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockBookRepository.findByIsbn).not.toHaveBeenCalled();
      expect(result.isbn).toBeNull();
    });

    it("should create book without totalPages (legacy book)", async () => {
      // Arrange
      const input = {
        title: "Ancient Manuscript",
        author: {
          name: "Ancient Author",
        },
      };

      const mockAuthor = { id: 4, name: "Ancient Author", nationalityId: null };
      const mockBook = new Book({
        id: 5,
        title: "Ancient Manuscript",
        isbn: null,
        authorId: 4,
        authorName: "Ancient Author",
        totalPages: null,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockAuthorRepository.findByName.mockResolvedValue(null);
      mockAuthorRepository.create.mockResolvedValue(mockAuthor);
      mockRequest.query.mockResolvedValue({ recordset: [{ id: 1 }] });
      mockBookRepository.create.mockResolvedValue(mockBook);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockBookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalPages: undefined,
        }),
        mockTransaction,
      );
      expect(result.totalPages).toBeNull();
    });

    it("should create BookStatusHistory entry with NULL → WISH_LIST", async () => {
      // Arrange
      const input = {
        title: "Test Book",
        author: { name: "Test Author" },
      };

      const mockAuthor = { id: 1, name: "Test Author", nationalityId: null };
      const mockBook = new Book({
        id: 1,
        title: "Test Book",
        isbn: null,
        authorId: 1,
        authorName: "Test Author",
        totalPages: null,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockAuthorRepository.findByName.mockResolvedValue(null);
      mockAuthorRepository.create.mockResolvedValue(mockAuthor);
      mockRequest.query.mockResolvedValue({ recordset: [{ id: 1 }] });
      mockBookRepository.create.mockResolvedValue(mockBook);

      // Act
      await service.execute(input);

      // Assert
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        {
          bookId: 1,
          oldStatus: null,
          newStatus: BookStatus.WISH_LIST,
          readingCycle: 1,
        },
        mockTransaction,
      );
    });

    it("should commit transaction on success", async () => {
      // Arrange
      const input = {
        title: "Test Book",
        author: { name: "Test Author" },
      };

      const mockAuthor = { id: 1, name: "Test Author", nationalityId: null };
      const mockBook = new Book({
        id: 1,
        title: "Test Book",
        isbn: null,
        authorId: 1,
        authorName: "Test Author",
        totalPages: null,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockAuthorRepository.findByName.mockResolvedValue(null);
      mockAuthorRepository.create.mockResolvedValue(mockAuthor);
      mockRequest.query.mockResolvedValue({ recordset: [{ id: 1 }] });
      mockBookRepository.create.mockResolvedValue(mockBook);

      // Act
      await service.execute(input);

      // Assert
      expect(mockTransaction.begin).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });
  });

  describe("❌ Error Cases", () => {
    it("should throw ConflictError if ISBN already exists", async () => {
      // Arrange
      const input = {
        title: "Duplicate Book",
        isbn: "9780134494166",
        author: { name: "Test Author" },
      };

      const existingBook = new Book({
        id: 1,
        title: "Existing Book",
        isbn: "9780134494166",
        authorId: 1,
        authorName: "Existing Author",
        totalPages: 300,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockBookRepository.findByIsbn.mockResolvedValue(existingBook);

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow(ConflictError);
      await expect(service.execute(input)).rejects.toThrow(
        "Book with ISBN 9780134494166 already exists",
      );
      // Transaction is not started when ISBN conflict is detected (happens before transaction)
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it("should rollback transaction on error", async () => {
      // Arrange
      const input = {
        title: "Test Book",
        author: { name: "Test Author" },
      };

      mockAuthorRepository.findByName.mockResolvedValue(null);
      mockAuthorRepository.create.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(service.execute(input)).rejects.toThrow("Database error");
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it("should create book with custom status COMPLETED for legacy books", async () => {
      // Arrange
      const input = {
        title: "Legacy Book",
        isbn: "9781234567890",
        totalPages: 500,
        status: BookStatus.COMPLETED,
        author: {
          name: "Legacy Author",
        },
      };

      const mockAuthor = { id: 10, name: "Legacy Author", nationalityId: null };
      const mockBook = new Book({
        id: 10,
        title: "Legacy Book",
        isbn: "9781234567890",
        authorId: 10,
        authorName: "Legacy Author",
        totalPages: 500,
        status: BookStatus.COMPLETED,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockBookRepository.findByIsbn.mockResolvedValue(null);
      mockAuthorRepository.findByName.mockResolvedValue(null);
      mockAuthorRepository.create.mockResolvedValue(mockAuthor);
      mockRequest.query.mockResolvedValue({ recordset: [{ id: 3 }] }); // COMPLETED status ID
      mockBookRepository.create.mockResolvedValue(mockBook);
      mockBookStatusHistoryRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockRequest.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT id FROM BookStatuses WHERE internal_code = @statusCode",
        ),
      );
      expect(mockBookRepository.create).toHaveBeenCalledWith(
        {
          title: "Legacy Book",
          isbn: "9781234567890",
          authorId: 10,
          totalPages: 500,
          statusId: 3,
        },
        mockTransaction,
      );
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        {
          bookId: 10,
          oldStatus: null,
          newStatus: BookStatus.COMPLETED,
          readingCycle: 1,
        },
        mockTransaction,
      );
      expect(result).toEqual(mockBook);
    });

    it("should create book with custom status READING for legacy books", async () => {
      // Arrange
      const input = {
        title: "In Progress Legacy Book",
        totalPages: 300,
        status: BookStatus.READING,
        author: {
          name: "Another Author",
        },
      };

      const mockAuthor = {
        id: 11,
        name: "Another Author",
        nationalityId: null,
      };
      const mockBook = new Book({
        id: 11,
        title: "In Progress Legacy Book",
        isbn: null,
        authorId: 11,
        authorName: "Another Author",
        totalPages: 300,
        status: BookStatus.READING,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockBookRepository.findByIsbn.mockResolvedValue(null);
      mockAuthorRepository.findByName.mockResolvedValue(null);
      mockAuthorRepository.create.mockResolvedValue(mockAuthor);
      mockRequest.query.mockResolvedValue({ recordset: [{ id: 2 }] }); // READING status ID
      mockBookRepository.create.mockResolvedValue(mockBook);
      mockBookStatusHistoryRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockBookRepository.create).toHaveBeenCalledWith(
        {
          title: "In Progress Legacy Book",
          isbn: undefined,
          authorId: 11,
          totalPages: 300,
          statusId: 2,
        },
        mockTransaction,
      );
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        {
          bookId: 11,
          oldStatus: null,
          newStatus: BookStatus.READING,
          readingCycle: 1,
        },
        mockTransaction,
      );
      expect(result).toEqual(mockBook);
    });

    it("should default to WISH_LIST when status is not provided", async () => {
      // Arrange
      const input = {
        title: "Default Status Book",
        author: {
          name: "Default Author",
        },
      };

      const mockAuthor = {
        id: 12,
        name: "Default Author",
        nationalityId: null,
      };
      const mockBook = new Book({
        id: 12,
        title: "Default Status Book",
        isbn: null,
        authorId: 12,
        authorName: "Default Author",
        totalPages: null,
        status: BookStatus.WISH_LIST,
        currentReadingCycle: 1,
        score: null,
        comment: null,
      });

      mockBookRepository.findByIsbn.mockResolvedValue(null);
      mockAuthorRepository.findByName.mockResolvedValue(null);
      mockAuthorRepository.create.mockResolvedValue(mockAuthor);
      mockRequest.query.mockResolvedValue({ recordset: [{ id: 1 }] }); // WISH_LIST status ID
      mockBookRepository.create.mockResolvedValue(mockBook);
      mockBookStatusHistoryRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.execute(input);

      // Assert
      expect(mockBookRepository.create).toHaveBeenCalledWith(
        {
          title: "Default Status Book",
          isbn: undefined,
          authorId: 12,
          totalPages: undefined,
          statusId: 1,
        },
        mockTransaction,
      );
      expect(mockBookStatusHistoryRepository.create).toHaveBeenCalledWith(
        {
          bookId: 12,
          oldStatus: null,
          newStatus: BookStatus.WISH_LIST,
          readingCycle: 1,
        },
        mockTransaction,
      );
      expect(result).toEqual(mockBook);
    });
  });
});
