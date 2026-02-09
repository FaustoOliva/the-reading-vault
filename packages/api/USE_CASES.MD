# API Use Cases – The Reading Vault

## 1. Purpose

This document defines **all allowed use cases** of the API.

Its goal is to:
- Freeze the functional scope of the system
- Prevent AI agents from inventing features or endpoints
- Serve as the single reference for implementing services (use cases)

This document defines **what the system can do**, not **how it is implemented**.

---

## 2. General Rules

- Each use case maps to **exactly one service**
- Services are **atomic and explicit**
- No hidden or implicit use cases are allowed
- All use cases must respect the rules defined in `DOMAIN.md`
- Errors referenced here must already exist in the error system

---

## 3. System Assumptions

- Single-user system
- No authentication or authorization
- All data belongs to the same logical user
- Execution environment: local only

---

## 4. Use Case Classification

Use cases are divided into:

- **Commands**: mutate system state
- **Queries**: read or compute data without mutation

Both are first-class citizens and must be explicitly listed.

---

## 5. Command Use Cases (State Mutations)

### 5.1 CreateBook

**Description**  
Registers a new book in the system. Supports legacy books by allowing initial status specification.

**Input**
- title
- author
- totalPages
- optional metadata (isbn, notes)
- **status** (optional) - Initial status for the book. Defaults to WISH_LIST if not provided. Required for legacy books with different initial states.

**Output**
- Book

**Models Involved**
- Book

**Errors**
- DuplicateISBNError
- InvalidInitialStateError

**Business Rules**
- New books without status default to WISH_LIST
- Legacy books can be created with any valid status (WISH_LIST, READING, COMPLETED, ABANDONED)
- When status is provided, it must be a valid BookStatus enum value
- Initial status COMPLETED or ABANDONED may require score (enforced at domain level)

**Transactional**
- Yes

---

### 5.2 StartReadingCycle

**Description**  
Starts a new reading cycle for an existing book.

**Input**
- bookId
- startDate

**Output**
- ReadingCycle

**Models Involved**
- Book
- ReadingCycle

**Errors**
- BookNotFoundError
- InvalidStateTransitionError

**Transactional**
- Yes

---

### 5.3 LogReadingSession

**Description**  
Logs a reading session within an active reading cycle.

**Input**
- bookId
- date
- pagesRead
- optional duration

**Output**
- ReadingSession

**Models Involved**
- Book
- ReadingCycle
- ReadingSession

**Errors**
- BookNotFoundError
- BookClosedError
- ImmutableSessionError
- InvalidStateTransitionError

**Transactional**
- Yes

---

### 5.4 CompleteBook

**Description**  
Marks a book as completed and closes the active reading cycle.

**Input**
- bookId
- completionDate
- score

**Output**
- CompletedBookSummary

**Models Involved**
- Book
- ReadingCycle

**Errors**
- BookNotFoundError
- MissingScoreError
- InvalidStateTransitionError

**Transactional**
- Yes

---

### 5.5 AbandonBook

**Description**  
Marks a book as abandoned and locks further reading activity.

**Input**
- bookId
- abandonmentDate
- score

**Output**
- AbandonedBookSummary

**Models Involved**
- Book
- ReadingCycle

**Errors**
- BookNotFoundError
- MissingScoreError
- InvalidStateTransitionError

**Transactional**
- Yes

---

## 6. Query Use Cases (Read-Only)

### 6.1 Standard Query Patterns

All query use cases follow these conventions:

#### Pagination Standard

```typescript
PaginationInput = {
  page: number,      // 1-indexed, default: 1
  limit: number      // default: 20, max: 100
}

PaginationOutput = {
  total: number,     // Total records matching filters
  page: number,      // Current page
  limit: number,     // Records per page
  totalPages: number // Calculated: ceil(total / limit)
}
```

#### Filtering Standard

```typescript
FilterInput = {
  field: value       // Exact match
  field_in: [values] // IN operator
  field_like: string // LIKE operator (case-insensitive)
  field_gte: value   // Greater than or equal
  field_lte: value   // Less than or equal
}
```

#### Sorting Standard

```typescript
SortInput = {
  field: 'field_name',
  order: 'asc' | 'desc'  // default: 'asc'
}
```

#### Performance Expectations

| Operation | Target | Max Acceptable |
|-----------|--------|----------------|
| By ID lookup | < 10ms | < 50ms |
| Filtered list (< 100 records) | < 50ms | < 200ms |
| Filtered list (100-1000 records) | < 200ms | < 500ms |
| Aggregations/KPIs | < 500ms | < 1000ms |

---

### 6.2 GetBooks

**Description**  
Returns all registered books with their current status, with support for filtering, sorting, and pagination.

**Input**
```typescript
{
  // Filters (all optional)
  filters?: {
    status_in?: BookStatus[],          // Filter by one or more statuses
    author_id?: number,                // Filter by author ID
    title_like?: string,               // Partial title match (case-insensitive)
    has_isbn?: boolean,                // true = only books with ISBN, false = only without
    score_gte?: number,                // Minimum score (0.0-10.0)
    score_lte?: number                 // Maximum score (0.0-10.0)
  },
  
  // Sorting (optional)
  sort?: {
    field: 'title' | 'created_at' | 'status' | 'score',
    order: 'asc' | 'desc'              // default: 'asc'
  },
  
  // Pagination (optional)
  pagination?: {
    page: number,                      // default: 1
    limit: number                      // default: 20, max: 100
  }
}
```

**Output**
```typescript
{
  books: Book[],                       // Array of book entities
  pagination: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}

// Book entity structure
Book = {
  id: number,
  title: string,
  isbn: string | null,
  author: {
    id: number,
    name: string,
    nationality: string | null
  },
  total_pages: number | null,
  status: BookStatus,                  // WISH_LIST, READING, COMPLETED, ABANDONED
  current_reading_cycle: number,
  pages_read_total: number,
  score: number | null,                // 0.0-10.0
  comment: string | null,
  created_at: Date
}
```

**Models Involved**
- Book
- Author

**Errors**
- BadRequestError (invalid pagination, invalid filter values)

**Transactional**
- No

**Performance Target**
- < 200ms for up to 1000 books

**Caching Strategy**
- No cache (always fetch fresh data)

---

### 6.3 GetBookById

**Description**  
Returns detailed information about a single book, including reading statistics for the current cycle.

**Input**
```typescript
{
  bookId: number
}
```

**Output**
```typescript
{
  book: BookDetails
}

// BookDetails structure
BookDetails = {
  id: number,
  title: string,
  isbn: string | null,
  author: {
    id: number,
    name: string,
    nationality: string | null
  },
  total_pages: number | null,
  status: BookStatus,
  current_reading_cycle: number,
  pages_read_total: number,
  pages_read_in_current_cycle: number,
  score: number | null,
  comment: string | null,
  created_at: Date,
  
  // Current cycle statistics
  current_cycle_stats: {
    sessions_count: number,
    first_session_date: Date | null,
    last_session_date: Date | null,
    days_elapsed: number,
    velocity: number | null,          // pages/day
    estimated_completion: Date | null  // null if total_pages is null
  },
  
  // Reading history
  reading_cycles: ReadingCycleSummary[]
}

ReadingCycleSummary = {
  cycle_number: number,
  status: BookStatus,
  sessions_count: number,
  total_pages_read: number,
  first_session: Date,
  last_session: Date,
  duration_days: number
}
```

**Models Involved**
- Book
- Author
- ReadingSession

**Errors**
- NotFoundError (book ID does not exist)

**Transactional**
- No

**Performance Target**
- < 100ms

**Caching Strategy**
- No cache

---

### 6.4 GetAuthors

**Description**  
Returns all registered authors in the system, sorted alphabetically, with optional text filtering.

**Input**
```typescript
{
  // Filters (optional)
  filters?: {
    name_like?: string               // Partial name match (case-insensitive)
  }
}
```

**Output**
```typescript
{
  authors: Author[]
}

// Author entity structure
Author = {
  id: number,
  name: string,
  nationality: string | null         // Country name or NULL
}
```

**Models Involved**
- Author

**Errors**
- None (empty array if no results)

**Transactional**
- No

**Performance Target**
- < 50ms for up to 1000 authors

**Caching Strategy**
- No cache (catalog data changes infrequently)

**Sorting**
- Always alphabetically by name (ASC)

---

### 6.5 GetCountries

**Description**  
Returns all available countries/nationalities in the system, sorted alphabetically, with optional text filtering.

**Input**
```typescript
{
  // Filters (optional)
  filters?: {
    name_like?: string               // Partial name match (case-insensitive)
  }
}
```

**Output**
```typescript
{
  countries: Country[]
}

// Country entity structure
Country = {
  id: number,
  name: string
}
```

**Models Involved**
- Country

**Errors**
- None (empty array if no results)

**Transactional**
- No

**Performance Target**
- < 50ms for up to 500 countries

**Caching Strategy**
- No cache (catalog data changes infrequently)

**Sorting**
- Always alphabetically by name (ASC)

---

### 6.6 GetReadingSessions

**Description**  
Returns reading sessions for a given book or date range, with filtering, sorting, and pagination support.

**Input**
```typescript
{
  // Filters (at least one required)
  filters: {
    book_id?: number,                  // Filter by book
    reading_cycle?: number,            // Filter by cycle (requires book_id)
    date_from?: Date,                  // Sessions on or after this date
    date_to?: Date,                    // Sessions on or before this date
    pages_read_gte?: number,           // Minimum pages read
    pages_read_lte?: number            // Maximum pages read
  },
  
  // Sorting (optional)
  sort?: {
    field: 'occurred_at' | 'pages_read' | 'created_at',
    order: 'asc' | 'desc'              // default: 'desc' (newest first)
  },
  
  // Pagination (optional)
  pagination?: {
    page: number,                      // default: 1
    limit: number                      // default: 50, max: 200
  }
}
```

**Output**
```typescript
{
  sessions: ReadingSession[],
  pagination: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  },
  
  // Summary statistics for filtered sessions
  summary: {
    total_pages_read: number,
    total_sessions: number,
    average_pages_per_session: number,
    date_range: {
      first: Date,
      last: Date
    }
  }
}

ReadingSession = {
  id: number,
  book_id: number,
  book_title: string,                  // Denormalized for convenience
  reading_cycle: number,
  pages_read: number,
  duration: number | null,             // minutes
  occurred_at: Date,
  created_at: Date
}
```

**Models Involved**
- ReadingSession
- Book

**Errors**
- BadRequestError (no filters provided, invalid date range)
- NotFoundError (book_id provided but does not exist)

**Transactional**
- No

**Performance Target**
- < 200ms for up to 1000 sessions

**Caching Strategy**
- No cache

---

## 7. KPI & Metrics Use Cases

KPIs are implemented as **explicit use cases** to avoid duplicated logic.

---

### 7.1 CalculateReadingKPIs

**Description**  
Calculates global reading metrics across all books and cycles for a given time period.

**Input**
```typescript
{
  // Date range (optional)
  filters?: {
    date_from?: Date,                  // default: account creation date
    date_to?: Date                     // default: now
  }
}
```

**Output**
```typescript
{
  kpis: GlobalReadingKPIs,
  period: {
    from: Date,
    to: Date,
    days: number
  }
}

GlobalReadingKPIs = {
  // Volume metrics
  total_books: number,                 // Total books in library
  books_completed: number,             // Books with status = COMPLETED
  books_in_progress: number,           // Books with status = READING
  books_abandoned: number,             // Books with status = ABANDONED
  
  // Reading activity
  total_sessions: number,              // Total reading sessions
  total_pages_read: number,            // Cumulative pages across all books
  
  // Averages
  average_pages_per_session: number,   // total_pages_read / total_sessions
  average_sessions_per_day: number,    // total_sessions / period.days
  average_pages_per_day: number,       // total_pages_read / period.days
  
  // Velocity & consistency
  current_streak: number,              // Consecutive days with at least 1 session
  longest_streak: number,              // Max consecutive days in period
  reading_days: number,                // Days with at least 1 session
  consistency_rate: number,            // reading_days / period.days (0.0-1.0)
  
  // Completion metrics
  completion_rate: number,             // books_completed / (total_books - wish_list)
  average_days_to_complete: number,    // Average cycle duration for completed books
  
  // Score analytics
  average_score: number | null,        // Average score across rated books
  books_rated: number                  // Books with non-null score
}
```

**Models Involved**
- Book
- ReadingSession

**Errors**
- BadRequestError (invalid date range: from > to)

**Transactional**
- No

**Performance Target**
- < 500ms for up to 10,000 sessions

**Caching Strategy**
- Cache for 5 minutes (sliding window)
- Invalidate on any book or session mutation

---

### 7.2 GetBookReadingStats

**Description**  
Calculates detailed reading statistics for a specific book, including cycle-by-cycle breakdown.

**Input**
```typescript
{
  bookId: number
}
```

**Output**
```typescript
{
  book: {
    id: number,
    title: string,
    status: BookStatus,
    current_cycle: number
  },
  
  overall_stats: {
    total_pages_read: number,          // Across all cycles
    total_sessions: number,            // Across all cycles
    total_cycles: number,              // Number of reading cycles
    first_session: Date | null,
    last_session: Date | null,
    score: number | null
  },
  
  current_cycle_stats: {
    cycle_number: number,
    pages_read: number,
    sessions_count: number,
    first_session: Date | null,
    last_session: Date | null,
    days_elapsed: number,
    velocity: number | null,           // pages/day for current cycle
    velocity_7d: number | null,        // 7-day moving average
    velocity_30d: number | null,       // 30-day moving average
    estimated_completion: Date | null, // null if total_pages is null
    progress_percent: number | null    // pages_read / total_pages * 100
  },
  
  cycle_history: ReadingCycleStats[]   // Historical cycles
}

ReadingCycleStats = {
  cycle_number: number,
  pages_read: number,
  sessions_count: number,
  first_session: Date,
  last_session: Date,
  duration_days: number,
  average_velocity: number,            // pages_read / duration_days
  completed: boolean,                  // Did this cycle finish the book?
  completion_date: Date | null
}
```

**Models Involved**
- Book
- ReadingSession

**Errors**
- NotFoundError (book ID does not exist)

**Transactional**
- No

**Performance Target**
- < 200ms

**Caching Strategy**
- Cache for 5 minutes per book
- Invalidate on session creation for this book

---

## 8. Explicitly Forbidden Use Cases

The following operations **must not exist**, even if they seem intuitive:

- Updating a book’s total pages after creation
- Editing or deleting reading sessions
- Reopening a completed or abandoned book automatically
- Modifying historical reading data
- Bulk-importing books or sessions
- Partial completion of a book without score

If a new use case is required, it must be:
- Explicitly added to this document
- Approved by a human

---

## 9. Agent Rules

AI agents:
- Must implement only use cases listed here
- Must not merge or split use cases without approval
- Must not infer new behaviors from similar systems
- Must report ambiguities instead of guessing

---

## 10. References

- DOMAIN.md
- ARCHITECTURE.md
- ERRORS.md
- AGENTS.md
