# 📐 Business Rules & Logic - The Reading Vault

**Version:** 1.0 | **Last Updated:** January 20, 2026 | **Status:** Single Source of Truth

---

## Table of Contents

1. [Architectural Foundation](#architectural-foundation)
2. [Core Entities & Constraints](#core-entities--constraints)
3. [Log Reading Session Workflow](#log-reading-session-workflow)
4. [Book Status & Cycle Management](#book-status--cycle-management)
5. [KPI Engine: Reading Velocity](#kpi-engine-reading-velocity)
6. [Data Integrity & Validation (Zod Guards)](#data-integrity--validation-zod-guards)
7. [Entity Management](#entity-management)
8. [State Transition Tables](#state-transition-tables)

---

## 1. Architectural Foundation

### 1.1 Database Structure Reference

> **⚠️ IMPORTANT:** For all database-related decisions (field types, table structure, foreign keys, constraints), refer to:
> - **[`packages/api/infraestructure/database/DATABASE_DESIGN.md`](packages/api/infraestructure/database/DATABASE_DESIGN.md)** (authoritative schema documentation)
> - **[`packages/api/infraestructure/database/init.sql`](packages/api/infraestructure/database/init.sql)** (actual implementation)
>
> This document (DOMAIN.md) focuses on **business logic, state transitions, and validation rules**. Field definitions below are summarized for context but may be simplified. When in doubt, DATABASE_DESIGN.md takes precedence for structure.

### 1.2 Design Pattern

- **Pattern:** Clean Architecture with clear separation of concerns:
  - **Domain Layer:** Entities, Value Objects, Business Rules, Exceptions
  - **Application Layer:** Use Cases, Validators (Zod schemas)
  - **Infrastructure Layer:** Repositories, Database Configuration, HTTP Adapters
  - **Presentation Layer:** Controllers, Routes, Error Handlers

### 1.3 Transactionality Requirements

- **Principle:** All Use Cases that mutate multiple tables MUST be wrapped in SQL transactions to ensure ACID compliance.
- **Affected Operations:**
  - `LogSessionUseCase` (mutates: `ReadingSessions`, `Books`, `BookStatusHistory`)
  - `ImportLegacyBookUseCase` (mutates: `Books`, `BookStatusHistory`)
  - `CompleteBookUseCase` (mutates: `Books`, `BookStatusHistory`)
  - `ReopenBookUseCase` (mutates: `Books`, `BookStatusHistory`)
- **Rollback Strategy:** If any mutation fails, entire transaction rolls back to preserve consistency.

### 1.4 Language Standard

- **Requirement:** 100% English for all code, comments, commit messages, and technical documentation.
- **Scope:** Variable names, function names, class names, comments, git messages.

---

## 2. Core Entities & Constraints

### 2.1 Book Entity

| Field                   | Type        | Constraints                                         | Notes                                                        |
| ----------------------- | ----------- | --------------------------------------------------- | ------------------------------------------------------------ |
| `id`                    | INT         | Primary Key, IDENTITY(1,1)                          | System-generated                                             |
| `title`                 | String      | Required, Max 255 chars                             |                                                              |
| `isbn`                  | String      | Max 20 chars, NULL allowed                          | NULL for legacy books without ISBN                           |
| `author_id`             | FK (Author) | Required, INT                                       | Must exist in Authors table                                  |
| `total_pages`           | Int         | NULL allowed                                        | NULL for legacy books; validated > 0 when provided           |
| `status_id`             | FK (BookStatuses) | INT, NOT NULL                                 | Internally FK; API exposes as enum (WISH_LIST, READING, etc.) |
| `current_reading_cycle` | Int         | >= 1, NOT NULL, DEFAULT 1                           | Incremented when status transitions from COMPLETED → READING |
| `score`                 | DECIMAL(3,1)| NULL allowed, 0.0 to 10.0                           | Mandatory when transitioning to COMPLETED or ABANDONED       |
| `comment`               | Text        | NULL allowed                                        | User commentary for reviews and recommendations              |

### 2.2 Reading Session Entity

| Field           | Type      | Constraints             | Notes                                                          |
| --------------- | --------- | ----------------------- | -------------------------------------------------------------- |
| `id`            | INT       | Primary Key, IDENTITY(1,1) | System-generated                                            |
| `book_id`       | FK (Book) | Required, INT           | Must reference valid Book                                      |
| `reading_cycle` | Int       | >= 1, NOT NULL, DEFAULT 1 | Captured from Book.current_reading_cycle at time of insert   |
| `pages_read`    | Int       | > 0, <= remaining_pages | Validation: pages_read + current_pages_in_cycle <= total_pages |
| `duration`      | Int       | NULL allowed            | Session duration in minutes (optional)                         |
| `occurred_at`   | Timestamp | User-defined date       | Optional, defaults to NOW. Must be <= server NOW               |
| `created_at`    | Timestamp | Server time             | Auto-generated at logging time                                 |

### 2.3 Book Status History Entity

| Field           | Type      | Constraints                    | Notes                     |
| --------------- | --------- | ------------------------------ | ------------------------- |
| `id`            | INT       | Primary Key, IDENTITY(1,1)     | System-generated          |
| `book_id`       | FK (Book) | Required, INT                  | Must reference valid Book |
| `old_status_id` | INT       | Foreign Key (BookStatuses.id)  | NULL for new books        |
| `new_status_id` | INT       | Foreign Key (BookStatuses.id), NOT NULL |                  |
| `reading_cycle` | Int       | NOT NULL, DEFAULT 1            | Cycle when transition occurred |
| `created_at`    | Timestamp | Server time, NOT NULL, DEFAULT GETDATE() | System-generated |

### 2.4 Author Entity

| Field            | Type        | Constraints               | Notes                                 |
| ---------------- | ----------- | ------------------------- | ------------------------------------- |
| `id`             | INT         | Primary Key, IDENTITY(1,1) | System-generated                     |
| `name`           | String      | Unique, NOT NULL, Max 255 | Must validate duplicate before insert |
| `nationality_id` | FK (Countries) | INT, NULL allowed      | References Countries table; NULL if unknown |

---

## 3. Log Reading Session Workflow

### 3.1 Input Validation (Entry Point)

**Zod Schema Validation:**

```
Input: {
  book_id: INT (required),
  pages_read: Int (required, > 0),
  occurred_at: Timestamp (optional, defaults to NOW, must be <= NOW)
}
```

**Validation Rules:**

1. ✅ `book_id` must reference an existing Book.
2. ✅ `pages_read` must be greater than 0.
3. ✅ `occurred_at` must be a valid timestamp <= current server time (no future dates).
4. ✅ IF `total_pages` IS NOT NULL: `pages_read` + `pages_read_in_current_cycle` must be <= `total_pages`.

### 3.2 Guard Clauses (Pre-Business Logic)

**Guard 1: ABANDONED Status**

```
IF Book.status == ABANDONED THEN
  THROW BookClosedException("This book is abandoned and locked. Manually reopen to continue.")
  Response: 403 Forbidden
END IF
```

_Rationale:_ Abandoned books represent a user decision to stop reading. They are locked until explicitly reopened.

### 3.3 Smart Transitions (Cycle Logic)

| Current Status | Trigger Event | Action                                                                                                                         | History Entry                                          | Cycle Change                   |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------ |
| `WISH_LIST`    | Log Session   | 1. Transition `status_id` to `READING` 2. Create history entry                                                                | `(WISH_LIST → READING, "USER_LOG_SESSION", cycle=1)`   | No change                      |
| `READING`      | Log Session   | 1. Update `pages_read_total` 2. Check for auto-completion (see 3.4)                                                            | Only if auto-completion occurs                         | Only if auto-completion occurs |
| `COMPLETED`    | Log Session   | 1. Increment `current_reading_cycle` 2. Transition `status_id` to `READING` 3. Create history entry 4. Reset `pages_read_in_current_cycle` | `(COMPLETED → READING, "USER_LOG_SESSION", cycle=N+1)` | +1                             |
| `ABANDONED`    | Log Session   | BLOCKED (Guard Clause 1)                                                                                                       | —                                                      | —                              |

**Note:** `status_id` is stored as INT (FK to BookStatuses). API layer translates to enum (WISH_LIST, READING, etc.) using `internal_code`.

### 3.4 Automated Completion (No Manual Override Allowed)

**Trigger Condition:**

```
IF total_pages IS NOT NULL AND (pages_read_in_current_cycle + pages_read) >= total_pages THEN
  TRANSITION Book.status_id to COMPLETED (status_id = 3)
  INSERT BookStatusHistory(old_status_id: READING, new_status_id: COMPLETED, reason: "COMPLETED_AUTO_TRANSITION")
  RETURN CompletionResponse with KPI summary
END IF
```

**Note:** Auto-completion only applies to books with `total_pages` defined. Legacy books without `total_pages` require manual completion.

**Key Constraint:** Manual transitions to COMPLETED are **forbidden** except during:

1. Initial book creation (status defaults to WISH_LIST or READING)
2. Legacy book import (status = COMPLETED, no ReadingSessions)

Rationale: Automatic completion ensures KPI history accuracy.

### 3.5 Persistence (Transaction Scope)

**Within a single SQL transaction:**

1. INSERT into `ReadingSessions`:
   - `book_id`, `pages_read`, `reading_cycle` (from Book.current_reading_cycle), `occurred_at`, `created_at`

2. UPDATE `Books`:
   - Increment `pages_read_total`
   - Update `status_id` if transition occurs (WISH_LIST → READING, COMPLETED → READING, or auto-completion)
   - Increment `current_reading_cycle` if COMPLETED → READING

3. INSERT into `BookStatusHistory` (if status changed):
   - `old_status_id`, `new_status_id`, `reading_cycle`, `created_at`

4. **Rollback Strategy:** If any step fails, entire transaction rolls back.

---

## 4. Book Status & Cycle Management

### 4.1 Status Definitions

> **Implementation Note:** Statuses are stored as `status_id` (INT FK to BookStatuses table). The API layer exposes them as enums using the `internal_code` field (WISH_LIST, READING, COMPLETED, ABANDONED).

| Status      | status_id | Description                                  | Can Log Session           | Can Transition To            | Notes                                   |
| ----------- | --------- | -------------------------------------------- | ------------------------- | ---------------------------- | --------------------------------------- |
| `WISH_LIST` | 1         | Book is on reading wishlist, not yet started | YES (→ READING)           | READING (auto)               | Initial state for new books             |
| `READING`   | 2         | Book is actively being read in current cycle | YES                       | COMPLETED (auto)             | Default working state                   |
| `COMPLETED` | 3         | Book finished in current cycle               | YES (→ READING + cycle++) | READING (manual log)         | Allows re-reading                       |
| `ABANDONED` | 4         | User decided to stop reading this book       | NO (BLOCKED)              | READING (manual reopen only) | Requires explicit user action to reopen |

### 4.2 Reading Cycles

**Definition:** A reading cycle is a contiguous period during which a user reads a book from start to finish.

**Properties:**

- Each book starts with `current_reading_cycle = 1`
- A cycle increments **only** when transitioning from COMPLETED → READING (re-reading)
- Each session stores its `reading_cycle` at the time of logging (immutable)
- KPIs must be calculated **per-cycle** to reflect velocity within that specific reading phase

**Example:**

```
Book: "The Great Gatsby"
Cycle 1: Pages 0 → 180 (COMPLETED)
  Sessions: 50p, 60p, 70p

Log Session (50p): COMPLETED → READING, cycle increments to 2

Cycle 2: Pages 0 → 180
  Sessions: 45p, 65p, ...
```

---

## 5. KPI Engine: Reading Velocity

### 5.1 Cycle-Specific Velocity

**Formula:**
$$\text{Velocity (pages/day)} = \frac{\text{Total pages read in current cycle}}{\text{Days elapsed in current cycle}}$$

**Definition of "Days Elapsed":**

- Count calendar days from first session in cycle to latest session
- **Day 0 Handling:** Treat as 1 day to avoid division by zero. Thus, if only one session exists on the same day, velocity = pages_read / 1

**Calculation Rule:**

```
days_elapsed = MAX(1, (latest_session_date - first_session_date + 1))
velocity = pages_read_in_current_cycle / days_elapsed
```

**Example:**

```
Book: "1984" (Total: 328 pages)
Cycle 1:
  - Day 1: 50 pages
  - Day 2: 60 pages
  - Day 5: 70 pages

days_elapsed = (Day 5 - Day 1 + 1) = 5 days
pages_read = 180 pages
velocity = 180 / 5 = 36 pages/day
```

### 5.2 Moving Averages (7-Day & 30-Day Windows)

**Purpose:** Smooth velocity fluctuations to detect reading patterns and trends.

**7-Day Velocity:**

- Sum of pages read in last 7 calendar days (rolling window)
- days_elapsed = 7 (or less if fewer days have sessions)
- Formula: `velocity_7d = pages_in_7d / 7`

**30-Day Velocity:**

- Sum of pages read in last 30 calendar days (rolling window)
- days_elapsed = 30 (or less if fewer days have sessions)
- Formula: `velocity_30d = pages_in_30d / 30`

**Isolation Constraint:**

- Moving averages MUST only consider sessions from `current_reading_cycle`
- Do NOT mix sessions from previous cycles

### 5.3 KPI Calculation Scope

**Calculated On:** Every read session log (real-time calculation)

**Required Fields in Response:**

- `velocity_current_cycle` (pages/day)
- `velocity_7d` (pages/day)
- `velocity_30d` (pages/day)
- `estimated_completion_date` = today + (remaining_pages / velocity_current_cycle)
- `reading_streak` (consecutive days with at least one session)
- `total_sessions_in_cycle` (count)

---

## 6. Data Integrity & Validation (Zod Guards)

### 6.1 Immutability Rules

**Rule 1: Session Immutability in Completed Cycles**

```
IF Book.status == COMPLETED AND ReadingSession.reading_cycle < Book.current_reading_cycle THEN
  Prevent UPDATE, DELETE on that session
  Throw ImmutableSessionException
END IF
```

_Rationale:_ Prevents KPI history tampering once a cycle is finalized.

**Rule 2: Total Pages Immutability**

```
IF Book.total_pages IS NOT NULL THEN
  Book.total_pages cannot be changed after creation
  Throw ImmutablePropertyException if attempted
END IF
```

**Note:** `total_pages` can be NULL for legacy books. Once set, it becomes immutable.

### 6.2 Session Validation

**Zod Schema:**

```typescript
LogSessionInput = z.object({
  book_id: z.number().int().positive(),
  pages_read: z.number().int().gt(0, "Pages must be greater than 0"),
  occurred_at: z.coerce.date().lte(new Date(), "Cannot log future sessions")
}).refine(
  (data) => /* validation logic: IF total_pages NOT NULL, pages_read + current_cycle_pages <= total_pages */,
  "Pages exceed remaining total"
)
```

### 6.3 ISBN Uniqueness

**Constraint:** `Books.isbn` can be NULL (for legacy books without ISBN). When provided, uniqueness should be validated.

**Validation Rule:**

```
IF isbn is NOT NULL AND EXISTS (SELECT 1 FROM Books WHERE isbn = input.isbn) THEN
  THROW DuplicateISBNException("A book with ISBN '...' already exists in your library.")
  Response: 409 Conflict
END IF
```

**UI Message:** "This ISBN is already in your library. Try searching for it instead."

**Note:** Database does not enforce UNIQUE constraint on `isbn` to allow NULL values for legacy books.

### 6.4 Scoring Mandate

**Rule:** Score (0.0 to 10.0) is **mandatory** when transitioning to:

- `COMPLETED` (automatic or manual)
- `ABANDONED` (manual user decision)

**Validation:**

```
IF (old_status != COMPLETED AND new_status == COMPLETED) OR
   (old_status != ABANDONED AND new_status == ABANDONED) THEN
  REQUIRE score in [0.0, 10.0]
  Throw MissingScoreException if not provided
END IF
```

### 6.5 Deletion Policy

**Hard Deletion:**

- ✅ ALLOWED: Delete books with NO associated ReadingSessions
- ❌ FORBIDDEN: Delete books WITH associated ReadingSessions

**Soft Deletion (ReadingSessions):**

- Set `deleted_at` timestamp instead of hard delete
- Soft-deleted sessions are excluded from KPI calculations
- Prevents breaking referential integrity and audit trails

**Cascade Rule:**

```
DELETE FROM Books WHERE id = ?
  IF EXISTS (SELECT 1 FROM ReadingSessions WHERE book_id = ? AND deleted_at IS NULL) THEN
    THROW IntegrityConstraintViolation("Cannot delete book with existing sessions.")
  END IF
```

---

## 7. Entity Management

### 7.1 Author Management

**Unique Name Constraint:**

- Author names are globally unique in the Authors table
- `Authors.name` has a UNIQUE index

**Deduplication Rule:**

```
IF author_input.name already exists THEN
  Reuse existing author record (ignore different nationality_id)
  RETURN existing author_id
ELSE
  Find or create Country by name (if provided)
  Create new author record
  INSERT Authors(name, nationality_id)
  RETURN new author_id
END IF
```

**Default Author:**

```
IF book_input.author is missing OR NULL THEN
  author_id = AUTHORS.find_or_create("Unknown Author", nationality_id: NULL)
END IF
```

**Rationale:** Prevents duplicate author records and maintains data consistency.

### 7.2 Legacy Book Import (`ImportLegacyBookUseCase`)

**Use Case Definition:**

- User imports a book they have already read (possibly years ago)
- No ReadingSessions are created; history is represented only by status and score

**Input:**

```
{
  title: String,
  isbn: String,
  author: String,
  total_pages: Int,
  score: Float (0.0-10.0),
  read_date: Date
}
```

**Processing:**

1. ✅ Validate all inputs (ISBN not duplicate if provided, score in range, etc.)
2. ✅ Find or create Author (deduplication)
3. ✅ Create Book with `status_id = COMPLETED`, `current_reading_cycle = 1`, `score`, and `comment`
4. ✅ Create BookStatusHistory entry: `(old_status_id: NULL → new_status_id: COMPLETED, cycle: 1)`
5. ❌ DO NOT create ReadingSessions
6. ✅ All within a single transaction

**Rationale:** Preserves historical data without fabricating reading sessions, maintains KPI integrity.

### 7.3 Book Scoring & Comments

**Implementation:** `score` and `comment` are stored directly in the `Books` table (no separate BookReview entity).

**Purpose:**

- Store user scoring and commentary about a book
- Enable future AI recommendation systems
- Support historical tracking of reading preferences

**Constraints:**

- `score` (DECIMAL 3,1) is mandatory when transitioning to COMPLETED or ABANDONED
- `comment` (NVARCHAR MAX) is optional and can be any length

**Lifecycle:**

```
ON Book.status_id → COMPLETED or ABANDONED:
  REQUIRE score in [0.0, 10.0]
  UPDATE Books SET score = input.score, comment = input.comment
END IF
```

---

## 8. State Transition Tables

### 8.1 Book Status Transitions (Complete State Machine)

| From        | To          | Trigger                         | Automatic?               | Requirements           | History Entry                                                           |
| ----------- | ----------- | ------------------------------- | ------------------------ | ---------------------- | ----------------------------------------------------------------------- |
| `WISH_LIST` | `READING`   | Log Session                     | ✅ Yes                   | None                   | `(WISH_LIST → READING, "USER_LOG_SESSION", cycle=1)`                    |
| `READING`   | `COMPLETED` | pages_read_total >= total_pages | ✅ Yes (Auto-completion) | None (condition-based) | `(READING → COMPLETED, "COMPLETED_AUTO_TRANSITION", cycle=N)`           |
| `COMPLETED` | `READING`   | Log Session                     | ✅ Yes                   | None                   | `(COMPLETED → READING, "USER_LOG_SESSION", cycle=N+1)` Increments cycle |
| `COMPLETED` | `ABANDONED` | User Decision                   | ❌ Manual                | Score required         | `(COMPLETED → ABANDONED, "USER_ABANDONED", cycle=N)`                    |
| `READING`   | `ABANDONED` | User Decision                   | ❌ Manual                | Score required         | `(READING → ABANDONED, "USER_ABANDONED", cycle=N)`                      |
| `ABANDONED` | `READING`   | User Reopen                     | ❌ Manual                | None                   | `(ABANDONED → READING, "USER_REOPENED", cycle=N+1)` Increments cycle    |
| `WISH_LIST` | `ABANDONED` | User Decision                   | ❌ Manual                | Score required         | `(WISH_LIST → ABANDONED, "USER_ABANDONED", cycle=1)`                    |

### 8.2 Session Logging Decision Tree

```
START: User logs reading session
  ├─ Validate input (pages_read > 0, occurred_at <= NOW, pages_read + cycle_pages <= total)
  │  └─ FAIL: Throw ValidationException
  │
  ├─ Fetch Book
  │  ├─ IF NOT FOUND: Throw BookNotFoundException
  │  └─ IF status_id == ABANDONED (4): Throw BookClosedException (GUARD CLAUSE)
  │
  ├─ BEGIN TRANSACTION
  │  ├─ INSERT ReadingSession (pages_read, occurred_at, reading_cycle from Book.current_reading_cycle)
  │  ├─ UPDATE Books.pages_read_total += pages_read
  │  ├─ Check if total_pages IS NOT NULL AND pages_read_total >= total_pages
  │  │  ├─ YES (Auto-Completion):
  │  │  │  ├─ UPDATE Books.status_id = COMPLETED (3)
  │  │  │  └─ INSERT BookStatusHistory (READING → COMPLETED, "COMPLETED_AUTO_TRANSITION")
  │  │  └─ NO:
  │  │     └─ IF Book.status_id == WISH_LIST (1):
  │  │        ├─ UPDATE Books.status_id = READING (2)
  │  │        └─ INSERT BookStatusHistory (WISH_LIST → READING, "USER_LOG_SESSION")
  │  │     └─ IF Book.status_id == COMPLETED (3):
  │  │        ├─ UPDATE Books.status_id = READING (2), current_reading_cycle += 1
  │  │        └─ INSERT BookStatusHistory (COMPLETED → READING, "USER_LOG_SESSION", cycle=N+1)
  │  │
  │  └─ COMMIT
  │
  └─ RETURN LogSessionResponse
       (session_id, velocity_current_cycle, velocity_7d, velocity_30d, estimated_completion, reading_streak)
```

---

## 9. Error Handling & HTTP Responses

### 9.1 Domain Exceptions

| Exception                      | HTTP Code       | Message                                                           | Trigger                                   |
| ------------------------------ | --------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `BookClosedException`          | 403 Forbidden   | "This book is abandoned and locked. Manually reopen to continue." | Logging session on ABANDONED book         |
| `BookNotFoundException`        | 404 Not Found   | "Book with ID '...' not found."                                   | Invalid book_id reference                 |
| `DuplicateISBNException`       | 409 Conflict    | "A book with ISBN '...' already exists in your library."          | ISBN uniqueness violation                 |
| `ValidationException`          | 400 Bad Request | Field-specific error messages                                     | Input validation fails                    |
| `ImmutableSessionException`    | 403 Forbidden   | "Cannot modify sessions in completed reading cycles."             | Attempt to edit/delete past cycle session |
| `IntegrityConstraintViolation` | 409 Conflict    | "Cannot delete book with existing sessions."                      | Hard delete with FK references            |
| `MissingScoreException`        | 400 Bad Request | "Score required when marking book as completed or abandoned."     | Missing score on transition               |

### 9.2 Success Response Format

```typescript
LogSessionResponse {
  session_id: INT,
  book: {
    id: INT,
    title: String,
    status: Enum (WISH_LIST, READING, COMPLETED, ABANDONED), // Mapped from status_id via internal_code
    current_reading_cycle: Int,
    pages_read_total: Int,
    total_pages: Int | null
  },
  kpi: {
    velocity_current_cycle: Float (pages/day),
    velocity_7d: Float (pages/day),
    velocity_30d: Float (pages/day),
    estimated_completion_date: Date | null, // null if total_pages is null
    reading_streak: Int (days),
    total_sessions_in_cycle: Int
  },
  transition_occurred: Boolean,
  status_change: {
    from: Enum | null,
    to: Enum | null
  } | null
}
```

---

## 10. Testing Strategy

### 10.1 Test Coverage Targets

- **Domain Logic:** 80-90% (State transitions, validations)
- **Use Cases:** 75-85% (Happy path, edge cases, exceptions)
- **Repositories:** 60-70% (Database operations, transactions)
- **Overall Target:** 70-80% code coverage

### 10.2 Critical Test Scenarios

#### LogSessionUseCase

- ✅ Log session on WISH_LIST (transition to READING)
- ✅ Log session on READING (accumulate, check auto-completion)
- ✅ Log session on COMPLETED (increment cycle, transition to READING)
- ❌ Log session on ABANDONED (throw BookClosedException)
- ✅ Auto-completion when pages_read_total >= total_pages
- ❌ Invalid pages_read (zero, negative, exceed remaining)
- ❌ Future occurred_at (must be <= NOW)
- ✅ Correct reading_cycle capture at time of session
- ✅ KPI calculation (velocity, moving averages, completion date)

#### ImportLegacyBookUseCase

- ✅ Import with valid metadata, score, read_date
- ✅ Author deduplication (create or reuse)
- ✅ Default "Unknown Author" if not provided
- ✅ Book status = COMPLETED, cycle = 1
- ✅ No ReadingSessions created
- ✅ BookStatusHistory entry with "LEGACY_IMPORT" reason
- ❌ Duplicate ISBN
- ❌ Invalid score (out of range)

#### Book Deletion

- ✅ Delete book with no sessions (hard delete)
- ❌ Delete book with sessions (throw IntegrityConstraintViolation)

---

## 11. Glossary

| Term               | Definition                                                                    |
| ------------------ | ----------------------------------------------------------------------------- |
| **Reading Cycle**  | A contiguous period of reading a book from start to finish                    |
| **Velocity**       | Pages read per day in the current reading cycle                               |
| **Moving Average** | Smoothed velocity over a rolling 7-day or 30-day window                       |
| **Day 0 Handling** | Treat single-day readings as 1 day to avoid division by zero                  |
| **Immutability**   | Sessions in completed cycles cannot be edited or deleted                      |
| **Guard Clause**   | Pre-condition check that prevents invalid operations (e.g., ABANDONED status) |
| **SSOT**           | Single Source of Truth - authoritative reference for all business logic       |

---

## 12. Revision History

| Date         | Version | Changes                                                                                                         |
| ------------ | ------- | --------------------------------------------------------------------------------------------------------------- |
| Jan 20, 2026 | 1.0     | Initial comprehensive SSOT document. Complete coverage of architectures, workflows, KPIs, and validation rules. |
