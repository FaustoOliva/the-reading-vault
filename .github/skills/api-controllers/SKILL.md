---
name: api-controllers
description: Rules for implementing HTTP controllers that handle requests, validation, and responses.
---

## Scope

Applies when creating/modifying controllers or implementing request/response handling.

---

## Source of Truth

1. ARCHITECTURE.MD 4.2 Controllers
2. EXECUTION_CONTRACT.md (async/await, error handling)
3. This skill (implementation patterns)

---

## Controller Responsibilities

**MUST:**

- Validate input using Zod
- Call exactly one service per endpoint
- Format HTTP responses
- Forward errors to middleware via 'next(error)'

**MUST NOT:**

- Contain business logic
- Call repositories directly
- Create domain errors
- Handle errors (except forwarding)

---

## File Structure

**Location:** 'packages/api/controllers/'  
**Naming:** '<entity>Controller.js' (camelCase, plural)  
**Class:** '<Entity>Controller' (PascalCase, singular)

---

## Class Pattern

```javascript
/**
 * BooksController
 * Handles HTTP requests for book-related operations
 */
import { z } from "zod";

export class BooksController {
  constructor(getBooksService, createBookService) {
    this.getBooksService = getBooksService;
    this.createBookService = createBookService;
  }

  async getBooks(req, res, next) {
    /* ... */
  }
  async createBook(req, res, next) {
    /* ... */
  }
}
```

---

## Input Validation (Zod)

**Define schemas at top of file:**

```javascript
import { z } from "zod";
import { BookStatus } from "../models/BookStatus.js";

const getBooksQuerySchema = z
  .object({
    status: z
      .enum([
        BookStatus.WISH_LIST,
        BookStatus.READING,
        BookStatus.COMPLETED,
        BookStatus.ABANDONED,
      ])
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  })
  .strict();

const createBookBodySchema = z
  .object({
    title: z.string().min(1).max(255),
    isbn: z.string().max(20).optional(),
    totalPages: z.number().int().positive().optional(),
  })
  .strict();
```

**Best Practices:**

- Use '.strict()' to reject unknown properties
- Use '.coerce' for query params (converts strings)
- Provide '.default()' values
- Reference enums from domain

---

## Endpoint Patterns

### GET (Query)

```javascript
async getBooks(req, res, next) {
  try {
    const validated = getBooksQuerySchema.parse(req.query);
    const { page, limit, ...filters } = validated;

    const result = await this.getBooksService.execute(filters, { page, limit });

    res.status(200).json({
      success: true,
      data: result.books.map(book => book.toJSON()),
      pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages }
    });
  } catch (error) {
    next(error);
  }
}
```

### POST (Command)

```javascript
async createBook(req, res, next) {
  try {
    const validated = createBookBodySchema.parse(req.body);
    const book = await this.createBookService.execute(validated);

    res.status(201).json({
      success: true,
      data: book.toJSON()
    });
  } catch (error) {
    next(error);
  }
}
```

### PUT/PATCH (Update)

```javascript
async updateBook(req, res, next) {
  try {
    const bookId = z.coerce.number().int().positive().parse(req.params.id);
    const validated = updateBookBodySchema.parse(req.body);
    const book = await this.updateBookService.execute(bookId, validated);

    res.status(200).json({ success: true, data: book.toJSON() });
  } catch (error) {
    next(error);
  }
}
```

### DELETE

```javascript
async deleteBook(req, res, next) {
  try {
    const bookId = z.coerce.number().int().positive().parse(req.params.id);
    await this.deleteBookService.execute(bookId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
```

---

## Response Format

**Success (200/201):**

```javascript
res.status(200).json({ success: true, data: entity.toJSON() });
```

**Success with Pagination:**

```javascript
res.json({ success: true, data: [...], pagination: { page, limit, total, totalPages } });
```

**Created (201):**

```javascript
res.status(201).json({ success: true, data: book.toJSON() });
```

**No Content (204):**

```javascript
res.status(204).send();
```

---

## Error Handling

**Rule:** Forward ALL errors to middleware via 'next(error)'.

```javascript
// CORRECT
async createBook(req, res, next) {
  try {
    const validated = schema.parse(req.body);
    const book = await this.service.execute(validated);
    res.status(201).json({ success: true, data: book.toJSON() });
  } catch (error) {
    next(error); // Middleware handles everything
  }
}

// WRONG: Manual error handling
async createBook(req, res, next) {
  try {
    // ...
  } catch (error) {
    if (error instanceof ConflictError) {
      return res.status(409).json({ error: error.message }); // NO!
    }
  }
}
```

---

## Entity Serialization

**Rule:** Call '.toJSON()' on entities before returning.

```javascript
// CORRECT
const book = await this.getBookService.execute(id);
res.json({ success: true, data: book.toJSON() });

// WRONG
res.json({ success: true, data: book }); // May include methods
```

---

## Parameter Extraction

**Path Parameters:**

```javascript
const bookId = z.coerce.number().int().positive().parse(req.params.id);
```

**Query Parameters:**

```javascript
const validated = querySchema.parse(req.query);
```

**Request Body:**

```javascript
const validated = bodySchema.parse(req.body);
```

---

## Dependency Injection

**Rule:** Receive services via constructor.

```javascript
export class BooksController {
  constructor(getBooksService, createBookService) {
    this.getBooksService = getBooksService;
    this.createBookService = createBookService;
  }
}

// WRONG: Global imports
import { getBooksService } from "../services/getBooksService.js";
```

---

## Async/Await

**Rule:** ALL controller methods MUST be async.

```javascript
// CORRECT
async getBooks(req, res, next) {
  try {
    const result = await this.service.execute();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// WRONG: Using .then()
getBooks(req, res, next) {
  this.service.execute()
    .then(result => res.json({ success: true, data: result }))
    .catch(error => next(error));
}
```

---

## Prohibited

- Business logic in controllers
- Calling repositories directly
- Creating domain errors
- Catching/handling specific errors
- Data transformations beyond JSON serialization
- Returning errors instead of using middleware

---

## User Decision Noted

**Validation schemas location:** Schemas should go in common package in the future. For now, keep in controller files.

---

## References

- ARCHITECTURE.MD 4.2 Controllers
- EXECUTION_CONTRACT.md Error Handling
- api-errors skill
- Existing: 'booksController.js', 'readingSessionsController.js'
