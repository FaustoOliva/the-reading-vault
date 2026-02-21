---
name: api-errors
description: Rules for designing, throwing and handling errors in the API using AppError hierarchy.
---

## Scope

This skill applies when working on:

- Controllers
- Services (Use Cases)
- Domain logic
- Error handling middleware
- HTTP error mapping

---

## Error Architecture Rules

### Base Rule

- **Every custom error MUST extend `AppError`.** No exceptions.
- **Throwing raw strings, plain `Error`, or ad-hoc objects is strictly forbidden.**
- All errors must carry: `message`, `statusCode`, `isOperational`, and `timestamp`.

### Available Error Classes

| Class             | Code | Use Case                         |
| ----------------- | ---- | -------------------------------- |
| `BadRequestError` | 400  | Input validation, malformed data |
| `NotFoundError`   | 404  | Resource not found               |
| `ConflictError`   | 409  | Duplicate or state conflict      |

---

## Layer Responsibilities

### Controllers

- **Only** translate Zod validation errors or captured exceptions to HTTP responses.
- **Must NOT** create domain-specific errors.
- **Must NOT** contain business logic.
- Catch and forward errors to middleware via `next(error)`.
- Never respond with error objects directly; always use middleware.

### Services (Use Cases)

- Can throw domain errors (e.g., `BookClosedError`) OR HTTP errors.
- Must NOT depend on HTTP semantics when throwing domain errors.
- Can throw meaningful, explicit errors (prefer domain-specific).
- When translating to HTTP, use explicit mapping (service or middleware).
- Example: if inventory insufficient, throw `BadRequestError` or domain-specific error.

### Domain (Entities, Value Objects)

- Can throw domain-specific errors.
- Must NOT import or throw HTTP errors.
- Errors must represent invariant violations or invalid state transitions.
- Example: `BookAlreadyCompletedError` (domain) vs. `ConflictError` (HTTP).

### Repositories

- Must NOT throw HTTP errors.
- Can throw:
  - Technical errors (database connection failures).
  - Generic domain-safe errors (e.g., "Resource not found").
- Database constraint violations (FK, UNIQUE, etc.) are **not** thrown directly.
  - Instead, let service layer catch and translate to appropriate HTTP error.
  - Example: Duplicate ISBN → service catches → throws `ConflictError`.

### Global Error Middleware

- Catches **all** unhandled errors (AppError and otherwise).
- Translates `AppError` instances to HTTP responses.
- Handles Zod validation errors separately.
- Returns 500 for truly unhandled errors.
- **Never** lets errors propagate beyond middleware.

---

## HTTP Error Mapping

| Scenario                     | Error Class             | Notes                    |
| ---------------------------- | ----------------------- | ------------------------ |
| Input validation fails (Zod) | `BadRequestError` (400) | Handled in middleware    |
| Resource not found           | `NotFoundError` (404)   | Repository or service    |
| Unique constraint violation  | `ConflictError` (409)   | Service catches DB error |

---

## Mandatory Error Properties

All `AppError` instances must expose:

- `message`
- `statusCode`
- `isOperational`
- `timestamp`

Optional but recommended:

- `details`
- `resource`

All `AppError` instances must expose:

- `message` (string)
- `statusCode` (number)
- `isOperational` (boolean)
- `timestamp` (string, ISO format)

Recommended:

- `details` (object): Field-level validation errors, constraints, etc.
- `resource` (string): Name or ID of affected resource (e.g., "Book", authorId).

---

## Zod Error Handling

### Rule

- Zod validation errors **MUST NOT be wrapped in AppError inside controllers.**
- Zod errors are **automatically translated by the global error middleware.**
- Response includes field-level details from Zod.

### Middleware Behavior

```javascript
if (err.name === "ZodError") {
  return res.status(400).json({
    error: "Invalid input data",
    details: err.issues,
  });
}
```

### What NOT to Do

```javascript
// ❌ WRONG: Wrapping Zod error in AppError
catch (err) {
  if (err instanceof ZodError) {
    throw new BadRequestError(err.message);  // Loses field details!
  }
}
```

### What to Do

```javascript
// ✅ CORRECT: Let middleware handle it
catch (err) {
  next(err);  // Middleware catches ZodError and formats it
}
```

---

## Prohibited Practices

- ✋ Throwing raw strings: `throw "Invalid state"`.
- ✋ Throwing plain Error: `throw new Error("Something failed")`.
- ✋ Returning error objects instead of throwing: `return { error: "..." }`.
- ✋ Creating HTTP errors in repositories.
- ✋ Catching errors only to silence them (no `catch () {}`).
- ✋ Mixing domain errors with HTTP errors in the same function without mapping.
- ✋ Creating errors without `statusCode` or `timestamp`.

---

## Examples

### Example 1: Correct Error Handling (Service Layer)

Service:

```javascript
import { NotFoundError } from "../errors/index.js";

export async function completeBookService(bookId, userId) {
  // Repository retrieval
  const book = await bookRepository.findById(bookId);
  if (!book) {
    throw new NotFoundError("Book not found");
  }

  // Update
  book.markAsCompleted();
  return bookRepository.save(book);
}
```

Controller:

```javascript
import { Router } from "express";
import { completeBookService } from "./service.js";

router.post("/:id/complete", async (req, res, next) => {
  try {
    const book = await completeBookService(req.params.id, req.user.id);
    res.json({ success: true, book });
  } catch (error) {
    next(error); // Middleware handles it
  }
});
```

### Example 2: Incorrect (Anti-Pattern)

```javascript
// ❌ WRONG: Responding directly from controller
if (book.status === "ABANDONED") {
  return res.status(403).json({ error: "Not allowed" });
}

// ❌ WRONG: Throwing raw string
throw "Invalid state";

// ❌ WRONG: Throwing plain Error
throw new Error("Something went wrong");

// ❌ WRONG: Creating HTTP error in repository
if (!found) {
  throw new NotFoundError("Not found"); // Repository should not know HTTP
}
```

---

## Expected Outcome

- Consistent, predictable error responses across all endpoints.
- Clear separation of concerns: domain errors vs. HTTP errors.
- Errors are easy to test, mock, and extend.
- Debugging is easier with rich metadata (timestamp, resource, details, stack).
- Client-side error handling is simplified by predictable HTTP codes.
