---
name: api-transactions
description: Rules for managing database transactions in services.
---

## Scope

Applies when implementing services that mutate data or affect multiple tables.

---

## Source of Truth

1. EXECUTION_CONTRACT.md (core transaction rules)
2. DOMAIN.md (business atomicity requirements)
3. This skill (implementation patterns)

---

## Core Rules

**Ownership:** Services control transactions. Repositories receive them.

**Services:**

- Create, begin, commit, rollback transactions
- Pass transaction to repositories

**Repositories:**

- Receive transaction as parameter
- NEVER create or manage transactions

---

## When Required

**Mandatory:**

- Any operation affecting 2+ tables
- Example: LogReadingSession (mutates ReadingSessions, Books, BookStatusHistory)

**Not Required:**

- Read-only queries
- Single-table operations with no side effects

**Rule:** If unsure, use transaction.

---

## Pattern (mssql)

### Complete Flow

```javascript
import sql from "mssql";

export class LogReadingSessionService {
  constructor(
    mssqlClient,
    bookRepository,
    sessionRepository,
    historyRepository,
  ) {
    this.mssqlClient = mssqlClient;
    this.bookRepository = bookRepository;
    this.sessionRepository = sessionRepository;
    this.historyRepository = historyRepository;
  }

  async execute(input) {
    // 1. Read data (BEFORE transaction)
    const book = await this.bookRepository.getById(input.bookId);
    const currentPages = await this.sessionRepository.getTotalPagesInCycle(
      bookId,
      book.cycle,
    );

    // 2. Execute business logic (delegated to domain)
    book.ensureCanAcceptSession();
    const transition = book.calculateTransition(currentPages, pagesRead);

    // 3. Begin transaction for writes
    const pool = await this.mssqlClient.getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 4. Persist mutations
      const session = await this.sessionRepository.create(data, transaction);

      if (transition.shouldTransition) {
        await this.bookRepository.updateStatus(id, status, cycle, transaction);
        await this.historyRepository.create(history, transaction);
      }

      await transaction.commit();
      return session;
    } catch (error) {
      await transaction.rollback();
      throw error; // MUST re-throw
    }
  }
}
```

---

## Lifecycle Steps

### 1. Create + Begin

```javascript
const pool = await this.mssqlClient.getConnection();
const transaction = new sql.Transaction(pool);
await transaction.begin();
```

### 2. Operations (Same Transaction)

```javascript
await this.sessionRepository.create(data, transaction);
await this.bookRepository.updateStatus(id, status, transaction);
await this.historyRepository.create(history, transaction);
```

**Rule:** Pass same transaction instance to all repository calls.

### 3. Commit

```javascript
await transaction.commit();
```

**Rule:** Commit only after ALL operations succeed.

### 4. Rollback (Error)

```javascript
catch (error) {
  await transaction.rollback();
  throw error; // Re-throw required
}
```

---

## Error Handling

### Rollback Pattern

```javascript
// CORRECT
try {
  await transaction.begin();
  // operations
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}

// WRONG: Silent catch
catch (error) {
  await transaction.rollback();
  // Missing throw!
}

// WRONG: Return error
catch (error) {
  await transaction.rollback();
  return { error: error.message }; // NO! Throw instead
}
```

### Error Translation

```javascript
catch (error) {
  await transaction.rollback();

  if (error.code === 'ER_DUP_ENTRY') {
    throw new ConflictError("Duplicate entry");
  }

  throw error;
}
```

---

## Read Operations

**Rule:** Reads happen OUTSIDE transactions.

```javascript
// CORRECT: Pure read use case
export class GetBooksService {
  async execute(filters) {
    return this.bookRepository.getAll(filters); // No transaction
  }
}

// WRONG: Transaction for reads
async execute(filters) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  const books = await this.bookRepository.getAll(filters);
  await transaction.commit(); // Unnecessary
}
```

---

## Conditional Writes

```javascript
await transaction.begin();

const session = await this.sessionRepository.create(data, transaction);

// Only write if business logic requires
if (transition.shouldTransition) {
  await this.bookRepository.updateStatus(id, status, transaction);
  await this.historyRepository.create(history, transaction);
}

await transaction.commit(); // All or nothing
```

---

## Parallel Operations

**Sequential writes (order matters):**

```javascript
await this.sessionRepository.create(data, transaction);
await this.bookRepository.update(id, status, transaction);
await this.historyRepository.create(history, transaction);
```

**Parallel reads (when safe):**

```javascript
const [book, sessions] = await Promise.all([
  this.bookRepository.getById(id),
  this.sessionRepository.getForBook(id),
]);
```

---

## Performance

### Keep Transactions Short

```javascript
// CORRECT: Fast transaction
await transaction.begin();
await this.repository.create(data, transaction);
await transaction.commit();

// WRONG: External calls inside transaction
await transaction.begin();
await this.externalAPI.fetch(); // NO! Do this before or after
await this.repository.create(data, transaction);
await transaction.commit();
```

**Pattern:** Execute slow operations BEFORE or AFTER transaction.

### Minimize Locks

```javascript
// CORRECT
const book = await this.bookRepository.getById(id);
await transaction.begin();
await this.bookRepository.update(book, transaction);
await transaction.commit();

// WRONG: Long computation holding locks
await transaction.begin();
const book = await this.bookRepository.getById(id);
await this.slowCalculation(); // Holds locks
await this.bookRepository.update(book, transaction);
await transaction.commit();
```

---

## Nested Transactions

**Rule:** SQL Server does NOT support true nested transactions.

**Pattern:** One transaction per service execution.

```javascript
// WRONG: Nested transactions fail
async execute(data) {
  const tx1 = new sql.Transaction(pool);
  await tx1.begin();
  await this.subService.execute(data); // Creates tx2 - fails
}

// CORRECT: Single transaction
async execute(data) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  await this.repository1.create(data, transaction);
  await this.repository2.update(id, data, transaction);
  await transaction.commit();
}
```

---

## Testing

```javascript
// Mock transaction
function createMockTransaction() {
  return {
    begin: vi.fn().mockResolvedValue(),
    commit: vi.fn().mockResolvedValue(),
    rollback: vi.fn().mockResolvedValue(),
  };
}

// Test rollback on error
test("rollback on error", async () => {
  const mockTx = createMockTransaction();
  mockRepository.create.mockRejectedValue(new Error("DB Error"));

  await expect(service.execute(data)).rejects.toThrow();

  expect(mockTx.begin).toHaveBeenCalled();
  expect(mockTx.rollback).toHaveBeenCalled();
  expect(mockTx.commit).not.toHaveBeenCalled();
});
```

---

## Prohibited

- Creating transactions in repositories
- Committing/rolling back in repositories
- Silent error catching (must re-throw)
- Returning error objects instead of throwing
- Nested transactions
- Multiple transactions per service
- Long-running operations in transaction
- Transaction without try/catch
- Forgetting rollback on error
- Transaction helper abstractions (keep explicit)

---

## Why Explicit Pattern

**No helper abstractions.** Keep transaction lifecycle visible:

1. Clarity - lifecycle is explicit in code
2. Control - fine-grained begin/commit/rollback
3. Debugging - easy to trace boundaries
4. Simplicity - no magic, no hidden behavior

---

## Expected Outcome

- ACID compliance for multi-table operations
- Consistent error handling
- Predictable rollback behavior
- Safe concurrent operations
- Testable transaction logic
- Explicit, readable boundaries

---

## References

- EXECUTION_CONTRACT.md - Transactions
- api-repositories skill - Transaction parameters
- logReadingSessionService.js - Reference implementation
