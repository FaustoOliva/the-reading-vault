# 📐 Business Rules & Logic - The Reading Vault

**Version:** 1.2 | **Last Updated:** March 7, 2026 | **Status:** Single Source of Truth

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
9. [Error Handling & HTTP Responses](#9-error-handling--http-responses)
10. [Reader Profile & AI Recommendations](#10-reader-profile--ai-recommendations)
11. [Glossary](#11-glossary)
12. [Revision History](#12-revision-history)

---

## 1. Architectural Foundation

### 1.1 Database Structure Reference

> **⚠️ IMPORTANT:** For all database-related decisions (field types, table structure, foreign keys, constraints), refer to:
>
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

### 1.3 Language Standard

- **Requirement:** 100% English for all code, comments, commit messages, and technical documentation.
- **Scope:** Variable names, function names, class names, comments, git messages.

---

## 2. Core Entities & Constraints

### 2.1 Book Entity

| Field                   | Type              | Constraints                  | Notes                                                                  |
| ----------------------- | ----------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `id`                    | INT               | Primary Key, IDENTITY(1,1)   | System-generated                                                       |
| `title`                 | String            | Required, Max 255 chars      |                                                                        |
| `isbn`                  | String            | Max 20 chars, NULL allowed   | NULL for legacy books without ISBN                                     |
| `book_type_id`          | FK (BookTypes)    | NULL allowed, INT            | Normalized 0..1 relation to predefined BookTypes (Novel, Memoir, etc.) |
| `synopsis`              | Text              | NULL allowed, Max 4000 chars | Short descriptive summary of the book                                  |
| `author_id`             | FK (Author)       | Required, INT                | Must exist in Authors table                                            |
| `total_pages`           | Int               | NULL allowed                 | NULL for legacy books; validated > 0 when provided                     |
| `publication_year`      | Int               | NULL allowed                 | Optional; if provided must be between 1000 and 9999                    |
| `status_id`             | FK (BookStatuses) | INT, NOT NULL                | Internally FK; API exposes as enum (WISH_LIST, READING, etc.)          |
| `current_reading_cycle` | Int               | >= 1, NOT NULL, DEFAULT 1    | Incremented when status transitions from COMPLETED → READING           |
| `score`                 | DECIMAL(3,1)      | NULL allowed, 0.0 to 10.0    | Mandatory when transitioning to COMPLETED or ABANDONED                 |
| `comment`               | Text              | NULL allowed                 | User commentary for reviews and recommendations                        |

**Metadata Enrichment Rules:**

- `book_type`, `genres`, and `synopsis` are optional enrichment fields.
- These fields may be entered manually or suggested by AI-assisted creation flows.
- AI suggestions are advisory; persistence only happens after explicit user confirmation.
- `book_type` is a single editorial classification (0..1 relation to BookTypes), while `genres` is a multi-value thematic list.
- `genres` are stored in a normalized relation: `Genres` + `BookGenres` (0..N per book).
- `book_type` is stored as a normalized relation with `BookTypes` table (0..1 per book, predefined values).

### 2.1.1 BookType Relation

| Table          | Purpose                                  | Constraints                               |
| -------------- | ---------------------------------------- | ----------------------------------------- |
| `BookTypes`    | Master catalog of editorial types        | `name` UNIQUE, Max 100 chars              |
| Books relation | Each book has 0 or 1 BookType assignment | FK `book_type_id` with ON DELETE SET NULL |

**Predefined BookType Values:**
Novel, Memoir, Anthology, Short-Story Collection, Poetry, Non-Fiction, Biography, Essay Collection, Self-Help, History

### 2.1.2 Genre Relation

| Table        | Purpose                                 | Constraints                                                           |
| ------------ | --------------------------------------- | --------------------------------------------------------------------- |
| `Genres`     | Catalog of unique genre names           | `name` UNIQUE, Max 100 chars                                          |
| `BookGenres` | Junction table between books and genres | Composite PK (`book_id`, `genre_id`), both FKs with ON DELETE CASCADE |

### 2.2 Reading Session Entity

| Field           | Type      | Constraints                | Notes                                                          |
| --------------- | --------- | -------------------------- | -------------------------------------------------------------- |
| `id`            | INT       | Primary Key, IDENTITY(1,1) | System-generated                                               |
| `book_id`       | FK (Book) | Required, INT              | Must reference valid Book                                      |
| `reading_cycle` | Int       | >= 1, NOT NULL, DEFAULT 1  | Captured from Book.current_reading_cycle at time of insert     |
| `pages_read`    | Int       | > 0, <= remaining_pages    | Validation: pages_read + current_pages_in_cycle <= total_pages |
| `duration`      | Int       | NULL allowed               | Session duration in minutes (optional)                         |
| `occurred_at`   | Timestamp | User-defined date          | Optional, defaults to NOW. Must be <= server NOW               |
| `created_at`    | Timestamp | Server time                | Auto-generated at logging time                                 |

### 2.3 Book Status History Entity

| Field           | Type      | Constraints                              | Notes                          |
| --------------- | --------- | ---------------------------------------- | ------------------------------ |
| `id`            | INT       | Primary Key, IDENTITY(1,1)               | System-generated               |
| `book_id`       | FK (Book) | Required, INT                            | Must reference valid Book      |
| `old_status_id` | INT       | Foreign Key (BookStatuses.id)            | NULL for new books             |
| `new_status_id` | INT       | Foreign Key (BookStatuses.id), NOT NULL  |                                |
| `reading_cycle` | Int       | NOT NULL, DEFAULT 1                      | Cycle when transition occurred |
| `created_at`    | Timestamp | Server time, NOT NULL, DEFAULT GETDATE() | System-generated               |

### 2.4 Author Entity

| Field            | Type           | Constraints                | Notes                                       |
| ---------------- | -------------- | -------------------------- | ------------------------------------------- |
| `id`             | INT            | Primary Key, IDENTITY(1,1) | System-generated                            |
| `name`           | String         | Unique, NOT NULL, Max 255  | Must validate duplicate before insert       |
| `nationality_id` | FK (Countries) | INT, NULL allowed          | References Countries table; NULL if unknown |

### 2.5 Country Entity

| Field      | Type   | Constraints                     | Notes                                               |
| ---------- | ------ | ------------------------------- | --------------------------------------------------- |
| `id`       | INT    | Primary Key, IDENTITY(1,1)      | System-generated                                    |
| `name`     | String | Unique, NOT NULL, Max 40        | Human-readable country name                         |
| `iso_code` | String | NOT NULL, UNIQUE, 2 chars (A-Z) | ISO 3166-1 alpha-2 code used by frontend flag icons |

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

| Current Status  | Trigger Event | Action                                                                                                                                     | History Entry                                          | Cycle Change                   |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------ |
| `WISH_LIST`     | Log Session   | 1. Transition `status_id` to `READING` 2. Create history entry                                                                             | `(WISH_LIST → READING, "USER_LOG_SESSION", cycle=1)`   | No change                      |
| `READING`       | Log Session   | 1. Update `pages_read_total` 2. Check for auto-completion (see 3.4)                                                                        | Only if auto-completion occurs                         | Only if auto-completion occurs |
| `COMPLETED`     | Log Session   | 1. Increment `current_reading_cycle` 2. Transition `status_id` to `READING` 3. Create history entry 4. Reset `pages_read_in_current_cycle` | `(COMPLETED → READING, "USER_LOG_SESSION", cycle=N+1)` | +1                             |
| `ABANDONED`     | Log Session   | BLOCKED (Guard Clause 1)                                                                                                                   | —                                                      | —                              |
| `PENDING_SCORE` | Log Session   | BLOCKED until the user reviews the book                                                                                                    | —                                                      | —                              |

**Note:** `status_id` is stored as INT (FK to BookStatuses). API layer translates to enum (WISH_LIST, READING, COMPLETED, ABANDONED, PENDING_SCORE) using `internal_code`.

### 3.4 Automated Completion (Review Required)

**Trigger Condition:**

```
IF total_pages IS NOT NULL AND (pages_read_in_current_cycle + pages_read) >= total_pages THEN
  TRANSITION Book.status_id to PENDING_SCORE (status_id = 5)
  INSERT BookStatusHistory(old_status_id: READING, new_status_id: PENDING_SCORE, reason: "AUTO_COMPLETION")
  RETURN Response indicating the book requires user review
END IF
```

**Note:** Auto-completion only applies to books with `total_pages` defined. Legacy books without `total_pages` require manual request-review or review flow.

**Key Constraint:** Automatic completion never assigns a final review status directly. Final transitions to `COMPLETED` or `ABANDONED` require explicit user review with score.

Manual transitions to final states are allowed during:

1. Initial book creation with explicit status (defaults to WISH_LIST if not provided)
2. Legacy book import with any valid status (WISH_LIST, READING, COMPLETED, ABANDONED)
3. `PENDING_SCORE → COMPLETED|ABANDONED` through review flow

**Status Selection During Creation:**

- If no status is provided → defaults to WISH_LIST
- If status is provided → must be a valid BookStatus enum value
- Legacy books can be created directly in COMPLETED or ABANDONED states
- Creating a book in COMPLETED or ABANDONED status may require score validation (enforced at domain level)

Rationale: Automatic completion ensures KPI history accuracy for ongoing books, while allowing historical data import.

### 3.5 Persistence Operations

**Required Data Mutations:**

1. INSERT into `ReadingSessions`:
   - `book_id`, `pages_read`, `reading_cycle` (from Book.current_reading_cycle), `occurred_at`, `created_at`

2. UPDATE `Books`:

- Increment `pages_read_total`
- Update `status_id` if transition occurs (WISH_LIST → READING, COMPLETED → READING, or auto-completion to PENDING_SCORE)
- Increment `current_reading_cycle` if COMPLETED → READING

3. INSERT into `BookStatusHistory` (if status changed):
   - `old_status_id`, `new_status_id`, `reading_cycle`, `created_at`

**Atomicity Requirement:** All three operations must succeed or fail together to maintain data integrity.

---

## 4. Book Status & Cycle Management

### 4.1 Status Definitions

> **Implementation Note:** Statuses are stored as `status_id` (INT FK to BookStatuses table). The API layer exposes them as enums using the `internal_code` field (WISH_LIST, READING, COMPLETED, ABANDONED, PENDING_SCORE).

| Status          | status_id | Description                                           | Can Log Session           | Can Transition To                   | Notes                                   |
| --------------- | --------- | ----------------------------------------------------- | ------------------------- | ----------------------------------- | --------------------------------------- |
| `WISH_LIST`     | 1         | Book is on reading wishlist, not yet started          | YES (→ READING)           | READING (auto)                      | Default initial state for new books     |
| `READING`       | 2         | Book is actively being read in current cycle          | YES                       | PENDING_SCORE (auto or manual)      | Default working state                   |
| `COMPLETED`     | 3         | Book finished in current cycle                        | YES (→ READING + cycle++) | READING (manual log)                | Allows re-reading                       |
| `ABANDONED`     | 4         | User decided to stop reading this book                | NO (BLOCKED)              | READING (manual reopen only)        | Requires explicit user action to reopen |
| `PENDING_SCORE` | 5         | Book requires user review to assign final score/state | NO (BLOCKED)              | COMPLETED or ABANDONED (via review) | Transitional review state               |

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

### 6.4 Publication Year Validation

**Constraint:** `Books.publication_year` is optional (`NULL` allowed).

**Validation Rule:**

```
IF publication_year IS NOT NULL AND (publication_year < 1000 OR publication_year > 9999) THEN
  THROW ValidationException("Publication year must be between 1000 and 9999")
END IF
```

### 6.5 Scoring Mandate

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
  author_id = DEFAULT_AUTHOR_ID ("Unknown Author")
END IF
```

### 7.2 Book Creation with Initial Status

**Use Case:** Support both new books and legacy book import scenarios.

**General Creation Rule:**

- New books without status specification default to `WISH_LIST`
- Legacy books can be created with any valid initial status

**Status-Specific Behavior:**

1. **WISH_LIST (default):**
   - No additional requirements
   - BookStatusHistory: `(NULL → WISH_LIST, cycle: 1)`

2. **READING:**
   - Suitable for books already started before system adoption
   - BookStatusHistory: `(NULL → READING, cycle: 1)`

3. **COMPLETED:**
   - Suitable for books already finished before system adoption
   - May require `score` and `comment` (validation at domain level)
   - BookStatusHistory: `(NULL → COMPLETED, cycle: 1)`
   - No ReadingSessions created (historical data)

4. **ABANDONED:**
   - Suitable for books abandoned before system adoption
   - May require `score` and `comment` (validation at domain level)
   - BookStatusHistory: `(NULL → ABANDONED, cycle: 1)`
   - No ReadingSessions created

**Common Processing:**

1. ✅ Validate all inputs (ISBN not duplicate if provided, etc.)
2. ✅ Accept optional metadata enrichment fields: `book_type`, `genres`, `synopsis`
3. ✅ Find or create Author (deduplication via author name)
4. ✅ Find or create Country (if nationality provided)
5. ✅ Create Book with specified `status_id` (or WISH_LIST if omitted)
6. ✅ Create BookStatusHistory entry: `(NULL → {specified_status}, cycle: 1)`

### 7.3 Legacy Book Import

**Legacy Import Note:** The general creation mechanism (7.2) handles legacy imports. No separate ImportLegacyBook use case is needed - use CreateBook with explicit status (COMPLETED or ABANDONED) when importing historical data.

**Key Points for Legacy Books:**

- Use CreateBook with explicit status (COMPLETED or ABANDONED)
- Provide `score` and optionally `comment` if status requires it
- Set `current_reading_cycle = 1`
- Do NOT create fabricated ReadingSessions
- BookStatusHistory will record: `(old_status_id: NULL → new_status_id: {status}, cycle: 1)`

**Rationale:** Preserves historical data without fabricating reading sessions, maintains KPI integrity.

### 7.4 Book Scoring & Comments

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
ON Book.status_id → COMPLETED or ABANDONED (via review):
  REQUIRE score in [0.0, 10.0]
  IF score IS NULL THEN
    THROW MissingScoreException
  END IF
  UPDATE Books SET score = input.score, comment = input.comment
END
```

**Note:** Score can be updated anytime via PUT /books/:id. Comment is always optional.

### 7.5 AI-Assisted Book Metadata

**Purpose:** Improve reader profile quality and future recommendation/synergy accuracy.

**Supported assisted fields:**

- `book_type`: one high-level editorial classification
- `genres`: one or more thematic categories
- `synopsis`: short profile-relevant description of the book

**Rules:**

- AI MAY suggest these values during book creation or enrichment flows.
- AI MUST NOT persist these values without an explicit user-confirmed save action.
- Services and repositories treat confirmed values exactly like manual input.
- Reader profile generation MAY use these fields as additional context signals.

---

## 8. State Transition Tables

### 8.1 Book Status Transitions (Complete State Machine)

| From            | To              | Trigger                         | Automatic?             | Requirements           | History Entry                                                           |
| --------------- | --------------- | ------------------------------- | ---------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `WISH_LIST`     | `READING`       | Log Session                     | ✅ Yes                 | None                   | `(WISH_LIST → READING, "USER_LOG_SESSION", cycle=1)`                    |
| `READING`       | `PENDING_SCORE` | pages_read_total >= total_pages | ✅ Yes (Auto-complete) | None (condition-based) | `(READING → PENDING_SCORE, "AUTO_COMPLETION", cycle=N)`                 |
| `READING`       | `PENDING_SCORE` | User Request Review             | ❌ Manual              | None                   | `(READING → PENDING_SCORE, "USER_REQUEST_REVIEW", cycle=N)`             |
| `PENDING_SCORE` | `COMPLETED`     | User Review                     | ❌ Manual              | Score required         | `(PENDING_SCORE → COMPLETED, "USER_REVIEW", cycle=N)`                   |
| `PENDING_SCORE` | `ABANDONED`     | User Review                     | ❌ Manual              | Score required         | `(PENDING_SCORE → ABANDONED, "USER_REVIEW", cycle=N)`                   |
| `COMPLETED`     | `READING`       | Log Session                     | ✅ Yes                 | None                   | `(COMPLETED → READING, "USER_LOG_SESSION", cycle=N+1)` Increments cycle |
| `ABANDONED`     | `READING`       | User Reopen                     | ❌ Manual              | None                   | `(ABANDONED → READING, "USER_REOPENED", cycle=N+1)` Increments cycle    |

**Invalid Transitions (Blocked):**

- `PENDING_SCORE` → `READING` via Log Session (throws `BookPendingReviewError`)
- `ABANDONED` → anywhere (except `READING` via reopen)

### 8.2 Session Logging Decision Tree

```

START: User logs reading session
├─ Validate input (pages_read > 0, occurred_at <= NOW, pages_read + cycle_pages <= total)
│ └─ FAIL: Throw ValidationException
│
├─ Fetch Book
│ ├─ IF NOT FOUND: Throw BookNotFoundException
│ ├─ IF status_id == ABANDONED (4): Throw BookClosedException (GUARD CLAUSE)
│ └─ IF status_id == PENDING_SCORE (5): Throw BookPendingReviewError (GUARD CLAUSE)
│
├─ Execute Persistence Operations:
│ ├─ INSERT ReadingSession (pages_read, occurred_at, reading_cycle from Book.current_reading_cycle)
│ ├─ UPDATE Books.pages_read_total += pages_read
│ ├─ Check if total_pages IS NOT NULL AND pages_read_total >= total_pages
│ │ ├─ YES (Auto-Completion):
│ │ │ ├─ UPDATE Books.status_id = PENDING_SCORE (5)
│ │ │ └─ INSERT BookStatusHistory (READING → PENDING_SCORE, "AUTO_COMPLETION")
│ │ └─ NO:
│ │ └─ IF Book.status_id == WISH_LIST (1):
│ │ ├─ UPDATE Books.status_id = READING (2)
│ │ └─ INSERT BookStatusHistory (WISH_LIST → READING, "USER_LOG_SESSION")
│ │ └─ IF Book.status_id == COMPLETED (3):
│ │ ├─ UPDATE Books.status_id = READING (2), current_reading_cycle += 1
│ │ └─ INSERT BookStatusHistory (COMPLETED → READING, "USER_LOG_SESSION", cycle=N+1)

│
└─ RETURN LogSessionResponse
(session_id, velocity_current_cycle, velocity_7d, velocity_30d, estimated_completion, reading_streak)

```

---

## 9. Error Handling & HTTP Responses

### 9.1 Domain Exceptions

| Exception                        | HTTP Code       | Message                                                                                              | Trigger                                                       |
| -------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `BookClosedException`            | 403 Forbidden   | "This book is abandoned and locked. Manually reopen to continue."                                    | Logging session on ABANDONED book                             |
| `BookPendingReviewError`         | 403 Forbidden   | "Book requires review (score) before logging new sessions. Complete or abandon the book first."      | Logging session on PENDING_SCORE book                         |
| `BookNotFoundException`          | 404 Not Found   | "Book with ID '...' not found."                                                                      | Invalid book_id reference                                     |
| `DuplicateISBNException`         | 409 Conflict    | "A book with ISBN '...' already exists in your library."                                             | ISBN uniqueness violation                                     |
| `ValidationException`            | 400 Bad Request | Field-specific error messages                                                                        | Input validation fails                                        |
| `ImmutableSessionException`      | 403 Forbidden   | "Cannot modify sessions in completed reading cycles."                                                | Attempt to edit/delete past cycle session                     |
| `IntegrityConstraintViolation`   | 409 Conflict    | "Cannot delete book with existing sessions."                                                         | Hard delete with FK references                                |
| `MissingScoreException`          | 400 Bad Request | "Score required when marking book as completed or abandoned."                                        | Missing score on transition                                   |
| `ReaderProfileMinimumBooksError` | 400 Bad Request | "Reader profile is not available yet. You need at least 5 completed or abandoned books (you have X)" | Recommendations or synergy requested before minimum threshold |

### 9.2 Success Response Format

```typescript
LogSessionResponse {
  session_id: INT,
  book: {
    id: INT,
    title: String,
    status: Enum (WISH_LIST, READING, COMPLETED, ABANDONED, PENDING_SCORE), // Mapped from status_id via internal_code
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

## 10. Reader Profile & AI Recommendations

### 10.1 Reader Profile Purpose

- The reader profile is a computed AI context artifact, not a user-managed entity.
- It combines structured reading data with a semantic summary used by downstream AI features.
- It is available only when `COMPLETED + ABANDONED >= 5`.

### 10.2 Refresh Strategy

- Important events (`book_completed`, `book_abandoned`) mark the profile as pending refresh.
- Refresh is deferred and evaluated during AI recommendation requests.
- The system refreshes only when the profile is stale and an important event is pending.

### 10.3 Summary Prompt Inputs

The profile summary generation may use:

- status-based book statistics
- ratings and comments
- top authors and countries
- abandoned-book signals
- enriched book metadata such as `book_type`, `genres`, and `synopsis`

### 10.4 AI Feature Scope

The MVP AI scope includes:

- reader profile generation
- on-demand book recommendations
- book-to-profile synergy analysis
- author-to-profile synergy analysis

The MVP AI scope excludes general-purpose chat.

### 10.1 Minimum Requirement for Profile Existence

**Rule:** Reader profile can exist only when:

```
completedBooks + abandonedBooks >= 5
```

If this requirement is not met, profile creation is blocked.

### 10.2 Startup Behavior

At server startup:

1. If profile already exists: do nothing.
2. If profile does not exist and minimum requirement is met: create initial profile.
3. If profile does not exist and minimum requirement is not met: do not create profile.

### 10.3 Recommendation Prerequisites

Recommendations require reader profile availability.

Flow when recommendations are requested:

1. If profile exists: continue.
2. If profile does not exist and minimum requirement is met: create profile and continue.
3. If minimum requirement is not met: throw `ReaderProfileMinimumBooksError`.

### 10.4 Refresh Rule (Deferred Refresh)

Important events are:

- `book_completed`
- `book_abandoned`

These events do **not** refresh profile immediately. They only set:

```
important_event_pending = true
```

Profile refresh happens only during recommendation requests and only when both conditions are true:

1. Profile is stale (`last_updated > 24 hours`).
2. `important_event_pending = true`.

After a successful refresh:

- `important_event_pending` must be reset to `false`.

### 10.5 Explicitly Removed Trigger

- `top_authors_changed` is **not** a refresh trigger.

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

| Date         | Version | Changes                                                                                                                                                                                                |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mar 7, 2026  | 1.2     | Added Reader Profile and AI Recommendations rules: minimum threshold (5 completed/abandoned), startup behavior, deferred refresh by pending important events, and removed top_authors_changed trigger. |
| Jan 20, 2026 | 1.0     | Initial comprehensive SSOT document. Complete coverage of architectures, workflows, KPIs, and validation rules.                                                                                        |
