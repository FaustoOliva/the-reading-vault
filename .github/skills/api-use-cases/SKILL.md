---
name: api-use-cases
description: Rules for implementing services strictly based on USE_CASES.md.
---

## Scope

This skill applies when:

- Implementing services
- Creating controllers for use cases
- Writing business orchestration logic
- Adding tests for use cases

---

## Source of Truth

Functional behavior is defined in:

1. USE_CASES.md
2. DOMAIN.md

Architecture and constraints are defined in:

- ARCHITECTURE.md
- AGENTS.md

Agents must NOT infer behavior beyond these documents.

---

## Service Creation Rules

- Each use case maps to exactly **one service**
- Service name must match use case name
- Services must be atomic and explicit
- Services must not combine multiple use cases

Example:
LogReadingSessionService

---

## Service Responsibilities

Services:

- Orchestrate domain models
- Enforce use case rules
- Control transactions
- Throw domain errors

Services must NOT:

- Perform input validation
- Format HTTP responses
- Catch errors without rethrowing

---

## Controller Rules

Controllers:

- Validate input using Zod
- Call exactly one service
- Forward errors to middleware

Controllers must NOT:

- Contain business logic
- Call repositories directly
- Transform domain rules

---

## Query Use Cases

Query use cases:

- Must not mutate state
- Can call repositories directly via services
- Must not open transactions

KPIs and metrics are implemented as explicit services.

---

## Error Handling

- Errors must extend AppError
- Domain errors originate in services or models
- Controllers never create domain errors

Refer to:

- ERRORS.md
- api-errors skill

---

## Testing Rules

- Each service must have tests
- Follow AAA pattern
- Test domain behavior, not implementation details
- Mock only repositories or infrastructure

**For transactional services (mutates 2+ tables):**

- Create unit tests: `<service>.test.js`
- Create integration tests: `transactionIntegration.test.js` or `<service>TransactionIntegration.test.js`

**Integration tests must cover:**

- Timeout handling (`ETIMEOUT`)
- Deadlock detection (SQL error 1205)
- Lock timeout (SQL error 1222)
- Rollback guarantees on any error
- Concurrent transaction conflicts

Coverage target: ≥ 80%

**Reference:** `api-testing` skill for complete patterns and examples.

---

## Prohibited Practices

❌ Inventing new use cases  
❌ Merging multiple use cases into one service  
❌ Adding logic not described in USE_CASES.md  
❌ CRUD-style generic services

---

## Expected Outcome

- One-to-one mapping between documentation and code
- Predictable services
- Domain-driven behavior
- AI-safe feature construction
