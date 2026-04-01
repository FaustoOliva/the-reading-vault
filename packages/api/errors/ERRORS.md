# Error System Architecture - The Reading Vault

## Overview

The error system implements a **hierarchical, type-safe error architecture** for Node.js/Express APIs. All errors extend `AppError`, ensuring consistent error handling across all layers.

```
errors/
├── base/
│   └── AppError.js          # Base class with statusCode, isOperational, timestamp
├── http/
│   ├── BadRequestError.js   # 400 - Input validation, malformed data
│   ├── NotFoundError.js     # 404 - Resource not found
│   ├── ConflictError.js     # 409 - Duplicate or state conflict
└── index.js                 # Centralized exports
```

---

## Core Principles

### Base Error Class

Every `AppError` instance carries:

| Property      | Type    | Purpose                                   |
| ------------- | ------- | ----------------------------------------- |
| message       | string  | Descriptive error message                 |
| statusCode    | number  | HTTP status code (400, 401, 404, etc.)    |
| isOperational | boolean | `true` = expected; `false` = critical bug |
| timestamp     | string  | ISO timestamp of error creation           |
| stack         | string  | JavaScript stack trace (auto-captured)    |

Optional properties (per error type):

- **details**: Additional context (validation errors, field-level info).
- **resource**: Name or ID of affected resource.

### Error Hierarchy

```
AppError (base, statusCode=500)
├── BadRequestError (400)
├── NotFoundError (404)
├── ConflictError (409)

```

---

## Usage

### Import

```javascript
import {
  AppError,
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "../errors/index.js";
```

### HTTP Status Codes by Error Type

| Error Class     | Code | Use Case                                |
| --------------- | ---- | --------------------------------------- |
| BadRequestError | 400  | Input validation failures, invalid data |
| NotFoundError   | 404  | Resource does not exist                 |
| ConflictError   | 409  | Duplicate resource or state conflict    |

---

## Usage Examples

### 400 - BadRequestError

For input validation failures, malformed data, or invalid parameters:

```javascript
// Simple validation
if (pagesRead < 1) {
  throw new BadRequestError("Pages read must be greater than 0");
}

// With details
throw new BadRequestError("Insufficient inventory", {
  available: 5,
  requested: 10,
});

// Format validation
if (!isValidEmail(email)) {
  throw new BadRequestError("Invalid email format");
}
```

### 404 - NotFoundError

Resource does not exist:

```javascript
// Basic case
const book = await bookRepository.findById(id);
if (!book) {
  throw new NotFoundError("Book not found");
}

// With resource type and ID
if (!author) {
  throw new NotFoundError("Author", authorId);
}
```

### 409 - ConflictError

Duplicate resource or state conflict:

```javascript
// Duplicate email
const existing = await userRepository.findByEmail(email);
if (existing) {
  throw new ConflictError(`User with email ${email} already exists`);
}

// State conflict
if (book.status === "ABANDONED") {
  throw new ConflictError("Cannot log session for abandoned book");
}
```

---

## HTTP Response Format

### AppError Response

When `globalErrorMiddleware` catches an `AppError`:

```json
{
  "error": "Descriptive message",
  "status": 400,
  "details": null,
  "resource": null,
  "stack": "Error: ..."
}
```

**Notes:**

- `details` is included only if present in the error instance.
- `resource` is included only if present in the error instance.
- `stack` is included only in development environment.

### Validation Error Response (Zod)

```json
{
  "error": "Invalid input data",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "number",
      "path": ["pages_read"],
      "message": "Number must be greater than or equal to 1"
    }
  ]
}
```

### Unhandled Error Response (500)

```json
{
  "error": "Internal server error",
  "stack": "Error: ..."
}
```

**Notes:**

- Production: generic error message.
- Development: actual error message and stack trace.

---

## Adding New Error Types

To create a new HTTP error class:

```javascript
// errors/http/PaymentError.js
import { AppError } from "../base/AppError.js";

export class PaymentError extends AppError {
  constructor(message = "Payment failed", paymentDetails = null) {
    super(message, 402); // Payment Required
    this.paymentDetails = paymentDetails;
  }
}

// errors/index.js
export { PaymentError } from "./http/PaymentError.js";
```

---

## Design Principles

1. **Type Safety**: All errors are instances of `AppError`; no strings or plain `Error` objects.
2. **Consistency**: All errors carry `statusCode`, `isOperational`, and `timestamp`.
3. **Extensibility**: New error types follow the same pattern.
4. **Semantic Clarity**: HTTP codes reflect actual error semantics.
5. **Testability**: Errors are easy to catch, assert, and mock.
6. **Debuggability**: Rich metadata (details, resource, timestamp, stack trace).

---

## References

- [Express Error Handling Best Practices](https://expressjs.com/en/guide/error-handling.html)
- [Node.js Error Handling](https://nodejs.org/api/errors.html)
- Inspired by: NestJS, Django REST Framework, Spring Boot
