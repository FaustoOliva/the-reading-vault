# 📐 Business Rules & Logic - The Reading Vault

## 1. Architectural Standards
* **Pattern:** Clean Architecture (Domain, Application, Infrastructure).
* **Transactionality:** All Use Cases involving multiple table updates (e.g., `LogSession` updating Books + History + Sessions) must be wrapped in a Database Transaction to ensure ACID compliance.
* **Language:** English for all code, comments, and technical documentation.

## 2. Core Workflows

### A. Log Reading Session (`LogSessionUseCase`)
**Actor:** User (Daily Tracker)

1.  **Input:** `book_id`, `pages_read`, `occurred_at` (Optional, defaults to NOW).
2.  **Audit:** System must automatically store `created_at` (server time) separately from `occurred_at` (user-defined date).
3.  **Status Guard Clauses:**
    * ❌ **IF** `status` is `ABANDONED`: Throw `BookClosedException`. *Rationale: Abandoned books are locked until manually reopened.*
4.  **Smart Transitions & Cycle Logic:**
    * ⚡ **IF** `status` is `WISH_LIST`:
        * Transition to `READING`.
        * Insert record into `BookStatusHistory` (`old: WISH_LIST`, `new: READING`).
    * 🔄 **IF** `status` is `COMPLETED`:
        * Transition back to `READING`.
        * Increment `current_reading_cycle` for the book.
        * Insert record into `BookStatusHistory` (`old: COMPLETED`, `new: READING`).
5.  **Validation:**
    * `pages_read` must be > 0.
    * `pages_read_in_current_cycle` + `pages_read` <= `book.total_pages`.
6.  **Persistence:**
    * Insert into `ReadingSessions` including the `reading_cycle` number.

### B. Import Legacy Book (`ImportLegacyBookUseCase`)
**Actor:** User (Populating history)

1.  **Input:** `Metadata`, `Score`, `ReadDate`.
2.  **Strict Constraint:**
    * 🚫 **DO NOT** create entries in `Reading