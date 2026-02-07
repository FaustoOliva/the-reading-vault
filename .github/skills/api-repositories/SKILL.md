---
name: api-repositories
description: Rules for implementing repository pattern for data persistence in the API.
---

## Scope

This skill applies when:
- Creating new repositories
- Modifying existing repositories
- Implementing data persistence operations
- Translating between database and domain entities

---

## Source of Truth

Repository implementation rules are defined in:
1. ARCHITECTURE.MD (layer responsibilities)
2. EXECUTION_CONTRACT.md (transaction rules)
3. This skill (implementation patterns)

---

## Repository Responsibilities

Repositories MUST:
- Handle data persistence operations
- Translate DB records into domain entities
- Accept transaction/session as parameter when needed
- Return domain entities (Book, ReadingSession, etc.)

Repositories MUST NOT:
- Contain business logic
- Know about HTTP status codes or errors
- Validate input (validation is in controllers)
- Create or manage transactions (services manage transactions)

---

## File Structure

**Location:** `packages/api/infraestructure/repositories/`

**Naming Convention:**
- File: `<entity>Repository.js` (camelCase)
- Class: `<Entity>Repository` (PascalCase)

**Example:**
```
infraestructure/
  repositories/
    bookRepository.js        ← BookRepository class
    authorRepository.js      ← AuthorRepository class
```

---

## Repository Pattern (Current Implementation)

### Constructor

**Rule:** Accept database client in constructor.

```javascript
export class BookRepository {
  constructor(mssqlClient) {
    this.mssqlClient = mssqlClient;
  }
}
```

### Transaction Handling Patterns

**Read operations (no transaction):**
```javascript
// ✅ Read operation - always outside transaction
async getById(bookId) {
  const pool = await this.mssqlClient.getConnection();
  const result = await pool.request()
    .input("bookId", sql.Int, bookId)
    .query("SELECT * FROM Books WHERE id = @bookId");
  
  if (result.recordset.length === 0) return null;
  return Book.fromDatabase(result.recordset[0]);
}

async getTotalPagesInCycle(bookId, cycle) {
  const pool = await this.mssqlClient.getConnection();
  const result = await pool.request()
    .input("bookId", sql.Int, bookId)
    .input("cycle", sql.Int, cycle)
    .query("SELECT ISNULL(SUM(pages_read), 0) as total FROM ReadingSessions WHERE book_id = @bookId AND reading_cycle = @cycle");
  
  return result.recordset[0].total;
}
```

**Write operations (transaction required):**
```javascript
// ✅ Write operations always require transaction
async create(data, transaction) {
  const request = new sql.Request(transaction);
  const result = await request
    .input("title", sql.NVarChar, data.title)
    .query("INSERT INTO Books (...) OUTPUT INSERTED.* VALUES (...)");
  
  return Book.fromDatabase(result.recordset[0]);
}

async updateStatus(bookId, newStatus, currentCycle, transaction) {
  await transaction.request()
    .input("bookId", sql.Int, bookId)
    .input("newStatus", sql.NVarChar, newStatus)
    .input("cycle", sql.Int, currentCycle)
    .query("UPDATE Books SET status_id = ..., current_reading_cycle = @cycle WHERE id = @bookId");
}
```

**Rule:** Repositories NEVER manage transactions. Services create/commit/rollback.

---

## Entity Translation

**Rule:** Use `fromDatabase()` factory method to create domain entities.

```javascript
// ✅ CORRECT: Return domain entity
async getById(bookId) {
  const result = await pool.request()
    .input("bookId", sql.Int, bookId)
    .query(query);
    
  if (result.recordset.length === 0) {
    return null;
  }
  
  return Book.fromDatabase(result.recordset[0]);
}

// ❌ WRONG: Return raw DB record
async getById(bookId) {
  const result = await pool.request().query(query);
  return result.recordset[0]; // NO! Must return domain entity
}
```

---

## Query Building

### Simple Queries

**Rule:** Use inline SQL for simple queries.

```javascript
async getById(bookId) {
  const query = `
    SELECT b.id, b.title, b.isbn, a.name as author_name
    FROM Books b
    INNER JOIN Authors a ON b.author_id = a.id
    WHERE b.id = @bookId
  `;
  
  const result = await pool.request()
    .input("bookId", sql.Int, bookId)
    .query(query);
}
```

### Complex Queries (OCP Pattern)

**Rule:** Use QueryBuilder for queries with dynamic filters.

```javascript
// ✅ CORRECT: Delegate to QueryBuilder
async getAll(filters = {}, pagination = { page: 1, limit: 10 }) {
  const queryBuilder = new BookQueryBuilder();
  
  if (filters.status) {
    queryBuilder.withStatus(filters.status);
  }
  
  if (filters.authorId) {
    queryBuilder.withAuthorId(filters.authorId);
  }
  
  queryBuilder.paginate(pagination.page, pagination.limit);
  
  const selectQuery = queryBuilder.buildSelectQuery();
  const selectRequest = pool.request();
  queryBuilder.applyParameters(selectRequest);
  
  const dataResult = await selectRequest.query(selectQuery);
  return dataResult.recordset.map(record => Book.fromDatabase(record));
}
```

---

## Error Handling

**Rule:** Let database errors propagate to service layer.

```javascript
// ✅ CORRECT: Don't catch DB errors in repository
async create(data, transaction) {
  const result = await transaction.request()
    .input("title", sql.NVarChar, data.title)
    .query(query);
  // Database errors (UNIQUE constraint, FK violation) propagate naturally
  return Book.fromDatabase(result.recordset[0]);
}

// ❌ WRONG: Catching and translating in repository
async create(data, transaction) {
  try {
    const result = await transaction.request().query(query);
    return Book.fromDatabase(result.recordset[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new ConflictError("Duplicate"); // NO! Service handles this
    }
  }
}
```

**Note:** Services translate database errors to domain/HTTP errors.

---

## Parallel Queries Optimization

**Rule:** Use `Promise.all` for independent queries.

```javascript
// ✅ CORRECT: Parallel queries
async getAll(filters, pagination) {
  const [dataResult, countResult] = await Promise.all([
    selectRequest.query(selectQuery),
    countRequest.query(countQuery)
  ]);
  // ...
}
```

---

## Return Value Conventions

| Operation | Return Type | Null Behavior |
|-----------|-------------|---------------|
| `getById(id)` | `Entity \| null` | null if not found |
| `getAll(filters)` | `Entity[]` | Empty array if none |
| `create(data, tx)` | `Entity` | Never null |
| `update(id, data, tx)` | `void` | Throws if not found |
| `delete(id, tx)` | `void` | Throws if not found |

---

## Documentation Template

**Rule:** Every repository file MUST have this header comment.

```javascript
/**
 * <Entity>Repository
 * Handles data persistence operations for <Entity> entity
 * 
 * Responsibilities:
 * - Query <entities> from database
 * - Translate DB records into <Entity> domain entities
 * - [Additional responsibilities]
 * 
 * Rules:
 * - No business logic
 * - No HTTP concerns
 * - Receives DB session/transaction explicitly when needed
 */
```

---

## Prohibited Practices

❌ Creating or managing transactions  
❌ Business logic or domain rules  
❌ Throwing HTTP errors (NotFoundError, ConflictError)  
❌ Input validation  
❌ Returning raw database records  
❌ Using global database connection  
❌ Mixing sync and async code  
❌ Logging (except critical DB errors)  

---

## Transaction Handling Pattern (Option C)

**Rule:** Separate methods for standalone reads vs transactional reads. Writes always require transaction.

### Read Operations

**Standalone reads (no transaction):**
```javascript
async getById(id)           // Single record by ID
async getAll(filters)       // Multiple records with filters
async findByIsbn(isbn)      // Find by unique constraint
```

**Transactional reads (within transaction context):**
```javascript
async getByIdInTransaction(id, transaction)
async findByIsbnInTransaction(isbn, transaction)
async getTotalPagesInCycleInTransaction(bookId, cycle, transaction)
```

**When to use transactional reads:**
- Reading data that will be modified in the same transaction
- Need consistent snapshot within transaction isolation level
- Avoiding race conditions on concurrent operations

### Write Operations

**All writes require transaction (mandatory last parameter):**
```javascript
async create(data, transaction)
async update(id, data, transaction)
async updateStatus(id, newStatus, transaction)
async delete(id, transaction)
```

### Parameter Position

**Rule:** Transaction always last parameter.

```javascript
// ✅ CORRECT
async create(data, transaction)
async updateStatus(id, status, cycle, transaction)
async getByIdInTransaction(id, transaction)

// ❌ WRONG
async create(transaction, data)
async updateStatus(transaction, id, status)
```

---

## Expected Outcome

- Predictable repository interface
- Clear transaction boundaries
- Easy to test (mock repositories)
- Domain entities as return types
- Database concerns isolated from business logic

---

## References

- ARCHITECTURE.MD § 4.5 Repositories
- EXECUTION_CONTRACT.md § Transactions
- Existing: `bookRepository.js`, `readingSessionRepository.js`
