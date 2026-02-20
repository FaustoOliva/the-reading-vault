---
name: api-testing
description: Rules for writing correct, executable and meaningful tests using Vitest.
---

## Scope

This skill applies when:
- Writing tests
- Updating existing tests
- Choosing what to test
- Mocking dependencies

---

## Testing Framework

- Vitest is the only allowed testing framework.
- Test files must use `.test.ts` or `.spec.ts`.
- Tests must run with no additional configuration.

---

## What to Test

### Services (Primary Focus)

- Each use case service MUST have unit tests.
- Test observable behavior, not implementation details.
- Mock repositories and infrastructure only.

### Domain Models

- Test invariants and state transitions.
- FSM behavior must be explicitly tested.
- Do NOT test getters or trivial value objects.

### Transaction Integration Tests (Mandatory for Transactional Services)

When a service uses transactions (mutates 2+ tables), create a dedicated integration test file.

**File naming:** `transactionIntegration.test.js` or `<service>TransactionIntegration.test.js`

**Required scenarios:**

1. **Timeout Handling**
   - Operation exceeds timeout limit
   - Multiple concurrent timeouts
   - Error code: `ETIMEOUT`

2. **Deadlock Detection**
   - SQL Server deadlock error (1205)
   - Verify rollback on deadlock
   - Test all transaction steps (not just first)

3. **Lock Timeout**
   - Resource locked by another transaction
   - Error code: `EREQUEST` with number 1222

4. **Rollback Guarantees**
   - Any error triggers rollback
   - Commit never executes after error
   - Rollback failure doesn't commit

5. **Concurrent Conflicts**
   - Concurrent modifications to same resource
   - One succeeds, one fails pattern

**Pattern:**

```javascript
describe("Transaction Integration Tests", () => {
  it("should rollback transaction when operation times out", async () => {
    // Arrange
    const mockTransaction = {
      begin: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined)
    };
    
    const originalTransaction = sql.Transaction;
    sql.Transaction = vi.fn(() => mockTransaction);
    
    // Simulate timeout error
    const timeoutError = new Error("Timeout");
    timeoutError.code = "ETIMEOUT";
    mockRepository.create.mockRejectedValue(timeoutError);
    
    // Act & Assert
    await expect(service.execute(input)).rejects.toThrow(timeoutError);
    
    // Verify transaction lifecycle
    expect(mockTransaction.begin).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    
    // Restore
    sql.Transaction = originalTransaction;
  });
});
```

**Key assertions:**
- `begin()` called exactly once
- `rollback()` called on error
- `commit()` never called on error
- Original error re-thrown

**Reference:** See `test/transactionIntegration.test.js` for complete examples.

---

## What NOT to Test

Tests must NOT:
- Import database clients
- Import HTTP servers
- Import controllers or routes
- Rely on real filesystem or network
- Test framework behavior

---

## Test Structure (AAA Mandatory)

Each test MUST follow:

1. Arrange
   - Build domain entities
   - Mock dependencies
2. Act
   - Execute the service or domain method
3. Assert
   - Verify result or thrown error

Mixing steps is forbidden.

---

## Mocking Rules

- Use `vi.fn()` and `vi.mock()` only.
- Mocks must be local to the test file.
- Do NOT mock domain models.
- Repositories must be mocked via interfaces or contracts.

---

## Error Testing

- Domain errors must be asserted explicitly.
- Use `toThrow()` with the exact error type.
- Do NOT assert on error messages.

---

## File Organization

- Tests live under `/test`
- Folder structure must mirror `/services` or `/models`
- One test file per service or domain entity
- Transaction integration tests: dedicated files (e.g., `transactionIntegration.test.js`)

**For transactional services:**
- Create both unit test (`<service>.test.js`) AND integration test
- Unit tests: mock transaction, test business logic
- Integration tests: verify transaction lifecycle, timeouts, deadlocks

---

## Coverage Rules

- Minimum coverage target: 70%
- Target coverage: 80%+
- Coverage is a quality signal, not a goal.
- Missing edge cases are more important than numbers.

**Mandatory for transactional services:**
- Unit tests covering business logic
- Integration tests covering transaction errors (timeout, deadlock, rollback)

---

## Prohibited Practices

❌ Snapshot testing  
❌ Testing private methods  
❌ Conditional logic inside tests  
❌ Sharing mutable state between tests  

---

## Expected Outcome

- Tests compile and run on first execution
- Clear intent per test
- Fast feedback loop
- No flaky behavior
