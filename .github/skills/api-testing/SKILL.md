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

---

## Coverage Rules

- Minimum coverage target: 70%
- Target coverage: 80%+
- Coverage is a quality signal, not a goal.
- Missing edge cases are more important than numbers.

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
