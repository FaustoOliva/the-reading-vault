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
Registers a new book in the system.

**Input**
- title
- author
- totalPages
- optional metadata (isbn, notes)

**Output**
- Book

**Models Involved**
- Book

**Errors**
- DuplicateISBNError
- InvalidInitialStateError

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

### 6.1 GetBooks

**Description**  
Returns all registered books with their current status.

**Input**
- optional filters (status, author)

**Output**
- Book[]

**Models Involved**
- Book

**Errors**
- None

**Transactional**
- No

---

### 6.2 GetBookById

**Description**  
Returns detailed information about a single book.

**Input**
- bookId

**Output**
- BookDetails

**Models Involved**
- Book
- ReadingCycle

**Errors**
- BookNotFoundError

**Transactional**
- No

---

### 6.3 GetReadingSessions

**Description**  
Returns reading sessions for a given book or date range.

**Input**
- bookId
- optional date range

**Output**
- ReadingSession[]

**Models Involved**
- ReadingSession

**Errors**
- BookNotFoundError

**Transactional**
- No

---

## 7. KPI & Metrics Use Cases

KPIs are implemented as **explicit use cases** to avoid duplicated logic.

---

### 7.1 CalculateReadingKPIs

**Description**  
Calculates global reading metrics across all books and cycles.

**Examples**
- total pages read
- average pages per session
- reading consistency
- completion rate

**Input**
- optional date range

**Output**
- ReadingKPIs

**Models Involved**
- Book
- ReadingCycle
- ReadingSession

**Errors**
- None

**Transactional**
- No

---

### 7.2 GetBookReadingStats

**Description**  
Calculates reading statistics for a specific book.

**Input**
- bookId

**Output**
- BookReadingStats

**Models Involved**
- Book
- ReadingCycle
- ReadingSession

**Errors**
- BookNotFoundError

**Transactional**
- No

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
