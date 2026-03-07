/**
 * BookQueryBuilder Unit Tests
 * Tests SQL query construction for book filtering
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BookQueryBuilder } from "../infraestructure/repositories/bookQueryBuilder.js";

describe("BookQueryBuilder", () => {
  let builder;

  beforeEach(() => {
    builder = new BookQueryBuilder();
  });

  describe("withStatus", () => {
    it("should add status filter condition", () => {
      builder.withStatus("COMPLETED");
      const query = builder.buildSelectQuery();

      expect(query).toContain("AND bs.internal_code = @status");
    });

    it("should add status parameter", () => {
      builder.withStatus("READING");
      builder.buildSelectQuery(); // Triggers parameter storage

      const params = Array.from(builder.params.entries());
      const statusParam = params.find(([name]) => name === "status");

      expect(statusParam).toBeDefined();
      expect(statusParam[1].value).toBe("READING");
    });
  });

  describe("withAuthorId", () => {
    it("should add author filter condition", () => {
      builder.withAuthorId(5);
      const query = builder.buildSelectQuery();

      expect(query).toContain("AND b.author_id = @authorId");
    });

    it("should add authorId parameter", () => {
      builder.withAuthorId(42);
      builder.buildSelectQuery();

      const params = Array.from(builder.params.entries());
      const authorParam = params.find(([name]) => name === "authorId");

      expect(authorParam).toBeDefined();
      expect(authorParam[1].value).toBe(42);
    });
  });

  describe("withCountryId", () => {
    it("should add country filter condition", () => {
      builder.withCountryId(10);
      const query = builder.buildSelectQuery();

      expect(query).toContain("AND c.id = @countryId");
    });

    it("should skip filter if countryId is falsy", () => {
      builder.withCountryId(null);
      const query = builder.buildSelectQuery();

      expect(query).not.toContain("countryId");
    });

    it("should add countryId parameter", () => {
      builder.withCountryId(15);
      builder.buildSelectQuery();

      const params = Array.from(builder.params.entries());
      const countryParam = params.find(([name]) => name === "countryId");

      expect(countryParam).toBeDefined();
      expect(countryParam[1].value).toBe(15);
    });
  });

  describe("withTitleSearch", () => {
    it("should add title or author search filter with LIKE operator", () => {
      builder.withTitleSearch("pragmatic");
      const query = builder.buildSelectQuery();

      expect(query).toContain(
        "AND (b.title LIKE @titleSearch OR a.name LIKE @titleSearch)",
      );
    });

    it("should wrap keyword with wildcards", () => {
      builder.withTitleSearch("Clean Code");
      builder.buildSelectQuery();

      const params = Array.from(builder.params.entries());
      const titleParam = params.find(([name]) => name === "titleSearch");

      expect(titleParam).toBeDefined();
      expect(titleParam[1].value).toBe("%Clean Code%");
    });

    it("should trim whitespace from keyword", () => {
      builder.withTitleSearch("  test  ");
      builder.buildSelectQuery();

      const params = Array.from(builder.params.entries());
      const titleParam = params.find(([name]) => name === "titleSearch");

      expect(titleParam[1].value).toBe("%test%");
    });

    it("should skip filter if keyword is empty or whitespace", () => {
      builder.withTitleSearch("   ");
      const query = builder.buildSelectQuery();

      expect(query).not.toContain("titleSearch");
    });

    it("should skip filter if keyword is null", () => {
      builder.withTitleSearch(null);
      const query = builder.buildSelectQuery();

      expect(query).not.toContain("titleSearch");
    });
  });

  describe("withScoreRange", () => {
    it("should add minimum score filter", () => {
      builder.withScoreRange(7.5, null);
      const query = builder.buildSelectQuery();

      expect(query).toContain("AND b.score >= @minScore");
      expect(query).not.toContain("maxScore");
    });

    it("should add maximum score filter", () => {
      builder.withScoreRange(null, 9.0);
      const query = builder.buildSelectQuery();

      expect(query).toContain("AND b.score <= @maxScore");
      expect(query).not.toContain("minScore");
    });

    it("should add both min and max score filters", () => {
      builder.withScoreRange(5.0, 8.5);
      const query = builder.buildSelectQuery();

      expect(query).toContain("AND b.score >= @minScore");
      expect(query).toContain("AND b.score <= @maxScore");
    });

    it("should add score parameters correctly", () => {
      builder.withScoreRange(6.0, 9.5);
      builder.buildSelectQuery();

      const params = Array.from(builder.params.entries());
      const minParam = params.find(([name]) => name === "minScore");
      const maxParam = params.find(([name]) => name === "maxScore");

      expect(minParam).toBeDefined();
      expect(minParam[1].value).toBe(6.0);
      expect(maxParam).toBeDefined();
      expect(maxParam[1].value).toBe(9.5);
    });

    it("should handle zero as valid minScore", () => {
      builder.withScoreRange(0, null);
      const query = builder.buildSelectQuery();

      expect(query).toContain("AND b.score >= @minScore");
    });

    it("should skip filters when both are null", () => {
      builder.withScoreRange(null, null);
      const query = builder.buildSelectQuery();

      expect(query).not.toContain("score >=");
      expect(query).not.toContain("score <=");
    });
  });

  describe("withPageRange", () => {
    it("should add minimum pages filter", () => {
      builder.withPageRange(200, null);
      const query = builder.buildSelectQuery();

      expect(query).toContain("AND b.total_pages >= @minPages");
      expect(query).not.toContain("maxPages");
    });

    it("should add maximum pages filter", () => {
      builder.withPageRange(null, 500);
      const query = builder.buildSelectQuery();

      expect(query).toContain("AND b.total_pages <= @maxPages");
      expect(query).not.toContain("minPages");
    });

    it("should add both min and max pages filters", () => {
      builder.withPageRange(100, 400);
      const query = builder.buildSelectQuery();

      expect(query).toContain("AND b.total_pages >= @minPages");
      expect(query).toContain("AND b.total_pages <= @maxPages");
    });

    it("should add page parameters correctly", () => {
      builder.withPageRange(150, 350);
      builder.buildSelectQuery();

      const params = Array.from(builder.params.entries());
      const minParam = params.find(([name]) => name === "minPages");
      const maxParam = params.find(([name]) => name === "maxPages");

      expect(minParam).toBeDefined();
      expect(minParam[1].value).toBe(150);
      expect(maxParam).toBeDefined();
      expect(maxParam[1].value).toBe(350);
    });
  });

  describe("withDateRange", () => {
    it("should add start date filter with EXISTS subquery", () => {
      builder.withDateRange("2025-01-01T00:00:00Z", null);
      const query = builder.buildSelectQuery();

      expect(query).toContain("EXISTS");
      expect(query).toContain("BookStatusHistory bsh");
      expect(query).toContain("bsh.created_at >= @startDate");
    });

    it("should add end date filter with EXISTS subquery", () => {
      builder.withDateRange(null, "2025-12-31T23:59:59Z");
      const query = builder.buildSelectQuery();

      expect(query).toContain("EXISTS");
      expect(query).toContain("bsh.created_at <= @endDate");
    });

    it("should add both start and end date filters", () => {
      builder.withDateRange("2025-01-01", "2025-12-31");
      const query = builder.buildSelectQuery();

      expect(query).toContain("bsh.created_at >= @startDate");
      expect(query).toContain("bsh.created_at <= @endDate");
    });

    it("should convert string dates to Date objects", () => {
      builder.withDateRange("2025-06-15T10:00:00Z", "2025-06-20T10:00:00Z");
      builder.buildSelectQuery();

      const params = Array.from(builder.params.entries());
      const startParam = params.find(([name]) => name === "startDate");
      const endParam = params.find(([name]) => name === "endDate");

      expect(startParam).toBeDefined();
      expect(startParam[1].value).toBeInstanceOf(Date);
      expect(endParam).toBeDefined();
      expect(endParam[1].value).toBeInstanceOf(Date);
    });

    it("should skip filters when both dates are null", () => {
      builder.withDateRange(null, null);
      const query = builder.buildSelectQuery();

      expect(query).not.toContain("EXISTS");
      expect(query).not.toContain("BookStatusHistory");
    });
  });

  describe("paginate", () => {
    it("should add OFFSET and FETCH clauses", () => {
      builder.paginate(2, 10);
      const query = builder.buildSelectQuery();

      expect(query).toContain("OFFSET @offset ROWS");
      expect(query).toContain("FETCH NEXT @limit ROWS ONLY");
    });

    it("should calculate correct offset for page 1", () => {
      builder.paginate(1, 10);
      builder.buildSelectQuery();

      const params = Array.from(builder.params.entries());
      const offsetParam = params.find(([name]) => name === "offset");

      expect(offsetParam[1].value).toBe(0);
    });

    it("should calculate correct offset for page 3", () => {
      builder.paginate(3, 20);
      builder.buildSelectQuery();

      const params = Array.from(builder.params.entries());
      const offsetParam = params.find(([name]) => name === "offset");

      expect(offsetParam[1].value).toBe(40); // (3 - 1) * 20
    });

    it("should store limit parameter", () => {
      builder.paginate(1, 50);
      builder.buildSelectQuery();

      const params = Array.from(builder.params.entries());
      const limitParam = params.find(([name]) => name === "limit");

      expect(limitParam[1].value).toBe(50);
    });
  });

  describe("Multiple Filters Combined", () => {
    it("should handle status + author + title search combination", () => {
      builder
        .withStatus("READING")
        .withAuthorId(5)
        .withTitleSearch("pragmatic");

      const query = builder.buildSelectQuery();

      expect(query).toContain("AND bs.internal_code = @status");
      expect(query).toContain("AND b.author_id = @authorId");
      expect(query).toContain(
        "AND (b.title LIKE @titleSearch OR a.name LIKE @titleSearch)",
      );
    });

    it("should handle all filters at once", () => {
      builder
        .withStatus("COMPLETED")
        .withAuthorId(3)
        .withCountryId(10)
        .withTitleSearch("clean")
        .withScoreRange(7, 10)
        .withPageRange(200, 500)
        .withDateRange("2025-01-01", "2025-12-31")
        .paginate(2, 15);

      const query = builder.buildSelectQuery();

      // Verify all conditions present
      expect(query).toContain("bs.internal_code = @status");
      expect(query).toContain("b.author_id = @authorId");
      expect(query).toContain("c.id = @countryId");
      expect(query).toContain(
        "(b.title LIKE @titleSearch OR a.name LIKE @titleSearch)",
      );
      expect(query).toContain("b.score >= @minScore");
      expect(query).toContain("b.score <= @maxScore");
      expect(query).toContain("b.total_pages >= @minPages");
      expect(query).toContain("b.total_pages <= @maxPages");
      expect(query).toContain("bsh.created_at >= @startDate");
      expect(query).toContain("bsh.created_at <= @endDate");
      expect(query).toContain("OFFSET @offset ROWS");
    });

    it("should store all parameters when using multiple filters", () => {
      builder
        .withStatus("ABANDONED")
        .withAuthorId(7)
        .withTitleSearch("test")
        .withScoreRange(5, 8)
        .paginate(1, 10);

      builder.buildSelectQuery();

      const params = Array.from(builder.params.entries());
      const paramNames = params.map(([name]) => name);

      expect(paramNames).toContain("status");
      expect(paramNames).toContain("authorId");
      expect(paramNames).toContain("titleSearch");
      expect(paramNames).toContain("minScore");
      expect(paramNames).toContain("maxScore");
      expect(paramNames).toContain("offset");
      expect(paramNames).toContain("limit");
    });
  });

  describe("buildCountQuery", () => {
    it("should include same filters as select query", () => {
      builder.withStatus("READING").withAuthorId(5);

      const countQuery = builder.buildCountQuery();

      expect(countQuery).toContain("SELECT COUNT(*) as total");
      expect(countQuery).toContain("AND bs.internal_code = @status");
      expect(countQuery).toContain("AND b.author_id = @authorId");
    });

    it("should not include pagination in count query", () => {
      builder.withStatus("COMPLETED").paginate(2, 10);

      const countQuery = builder.buildCountQuery();

      expect(countQuery).not.toContain("OFFSET");
      expect(countQuery).not.toContain("FETCH");
    });
  });

  describe("reset", () => {
    it("should clear all filters and parameters", () => {
      builder.withStatus("READING").withAuthorId(5).paginate(2, 10).reset();

      const query = builder.buildSelectQuery();

      expect(query).not.toContain("@status");
      expect(query).not.toContain("@authorId");
      expect(query).not.toContain("OFFSET");
    });

    it("should allow reuse after reset", () => {
      builder.withStatus("READING").reset().withStatus("COMPLETED");

      const query = builder.buildSelectQuery();

      expect(query).toContain("bs.internal_code = @status");

      const params = Array.from(builder.params.entries());
      const statusParam = params.find(([name]) => name === "status");

      expect(statusParam[1].value).toBe("COMPLETED");
    });
  });

  describe("applyParameters", () => {
    it("should apply all stored parameters to request", () => {
      builder.withStatus("READING").withAuthorId(5).paginate(1, 10);
      builder.buildSelectQuery();

      const mockRequest = {
        input: vi.fn().mockReturnThis(),
      };

      builder.applyParameters(mockRequest);

      expect(mockRequest.input).toHaveBeenCalledWith(
        "status",
        expect.anything(),
        "READING",
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "authorId",
        expect.anything(),
        5,
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "offset",
        expect.anything(),
        0,
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "limit",
        expect.anything(),
        10,
      );
    });
  });

  describe("Method Chaining", () => {
    it("should support fluent interface for all methods", () => {
      const result = builder
        .withStatus("READING")
        .withAuthorId(5)
        .withCountryId(10)
        .withTitleSearch("test")
        .withScoreRange(7, 10)
        .withPageRange(200, 500)
        .withDateRange("2025-01-01", "2025-12-31")
        .paginate(1, 10);

      expect(result).toBe(builder);
    });
  });
});
