---
name: api-domain
description: Rules for designing and evolving domain entities, enums, state machines, and enforcing domain invariants with SOLID principles.
---

## Scope

This skill applies when working on:

- Domain entities
- Domain enums
- Finite State Machines (FSM)
- Domain invariants
- Business behavior in models
- Value objects (future scope)

---

## Domain Architecture Rules

### Single Source of Truth

- **DOMAIN.md is the absolute authority for all business rules.**
- **Domain models must NOT invent, simplify, or reinterpret business rules.**
- **Domain logic must NOT leak into services, controllers, or repositories.**

### Layer Positioning

- Domain entities live in `packages/api/models/`
- Domain enums live in `packages/api/models/`
- Domain does NOT import from:
  - Controllers
  - Services
  - Repositories
  - HTTP errors
  - Infrastructure

### Language Standard

- All domain code MUST be written in **English**.
- Class names, method names, variables, comments: English only.
- No Spanish in domain code, even in documentation strings.


---

## What Domain Is (and Is Not)

Domain IS:
- Business rules
- State transitions
- Invariants
- Decisions intrinsic to the business

Domain IS NOT:
- Data fetching logic
- Filtering, sorting, pagination
- Reporting or KPIs
- Cross-entity orchestration

---

## Entity Design Rules

### Entity Responsibility

Entities are **rich in behavior**, not data containers.

Entities MUST:
- Encapsulate domain invariants
- Own state transition logic
- Enforce business rules
- Expose explicit query methods (e.g., `isReadable()`, `isClosed()`)
- Provide factory methods (e.g., `fromDatabase()`)

Entities MUST NOT:
- Perform I/O operations (DB access, HTTP calls)
- Depend on services or repositories
- Perform input validation (validation is in controllers via Zod)
- Know about HTTP status codes or error classes

### Constructor Discipline

- Constructors accept validated data.
- Constructors DO NOT perform validation.
- Constructors DO NOT throw errors unless invariants are violated.
- Use factory methods (e.g., `fromDatabase()`) to create entities from persistence.

### Method Naming

- Use clear, intention-revealing names.
- Prefix boolean queries with `is`, `has`, `can`:
  - `isReadable()`
  - `hasCompletedCycle()`
  - `canLogSession()`
- Use verbs for actions:
  - `markAsCompleted()`
  - `incrementCycle()`
  - `transitionTo(status)`

### Immutability Preference

- Prefer immutability where feasible.
- If mutable state is required, ensure mutations preserve invariants.
- State changes should be explicit and intentional, never implicit.

---

## Enum Design Rules

### Mandatory Enum Usage

- **All domain state values MUST be enums.**
- **String literals for states are strictly forbidden.**
- **Magic numbers are strictly forbidden.**

Example:
```javascript
// ✅ CORRECT
export const BookStatus = Object.freeze({
  WISH_LIST: 'WISH_LIST',
  READING: 'READING',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED'
});

// ❌ WRONG
if (book.status === 'READING') { ... }  // String literal
```

### Enum Location

- Enums are defined in `packages/api/models/`
- One enum per file (unless tightly coupled)
- Filename matches enum name: `BookStatus.js`

### Enum Helpers

Enums SHOULD provide helper functions:
- `getValidStatuses()` - Returns all values
- `isValidStatus(value)` - Validates a value
- `getTransitionsFrom(status)` - Returns valid transitions (if applicable)

### Enum Documentation

Each enum value MUST be documented in a comment:
```javascript
export const BookStatus = Object.freeze({
  WISH_LIST: 'WISH_LIST',    // Book is on wishlist, not started
  READING: 'READING',        // Book is actively being read
  COMPLETED: 'COMPLETED',    // Book finished in current cycle
  ABANDONED: 'ABANDONED'     // User stopped reading, locked
});
```

---

## Finite State Machines (FSM)

- Services may REQUEST state changes.
- Entities DECIDE whether a transition is allowed.
- Services must NOT replicate FSM rules.

### FSM Requirement

- **State transitions MUST be explicit and declarative.**
- **State machines MUST live in the domain layer.**
- **FSMs are not optional if DOMAIN.md defines state transitions.**

### FSM Structure

Define:
1. **States** (via enum)
2. **Transitions** (allowed state changes)
3. **Triggers** (events causing transitions)
4. **Guards** (conditions that block transitions)

### FSM Implementation Patterns

**Option 1: Transition Map (Preferred for Simple FSMs)**
```javascript
const TRANSITIONS = Object.freeze({
  [BookStatus.WISH_LIST]: [BookStatus.READING],
  [BookStatus.READING]: [BookStatus.COMPLETED],
  [BookStatus.COMPLETED]: [BookStatus.READING],
  [BookStatus.ABANDONED]: [BookStatus.READING]  // Manual reopen only
});

function canTransitionTo(fromStatus, toStatus) {
  return TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}
```

**Option 2: State Pattern (Preferred for Complex FSMs)**
- Separate classes for each state
- State-specific behavior encapsulated
- Transitions delegated to state objects

### Guard Clauses

Guards MUST be explicit and domain-driven:
```javascript
if (book.status === BookStatus.ABANDONED) {
  throw new BookClosedError("Book is abandoned. Reopen it manually.");
}
```

### FSM Documentation

- State transition tables MUST be documented in code comments.
- Reference DOMAIN.md explicitly for rationale.

---

## Domain Invariants

### Invariant Definition

An invariant is a rule that MUST always hold true for a domain object.

Examples:
- `totalPages > 0`
- `currentReadingCycle >= 1`
- `pages_read_in_cycle <= total_pages`

### Invariant Enforcement

Entities MUST enforce invariants in:
- Constructors (for creation invariants)
- Methods (for mutation invariants)

Invariants are checked BEFORE state changes, not after.

### Invariant Violation = Error

If an invariant is violated:
1. Throw a **domain-specific error** (NOT an HTTP error).
2. Use descriptive error messages.
3. Include context (e.g., which field, what value).

Example:
```javascript
if (this.totalPages <= 0) {
  throw new InvalidBookDataError("Total pages must be greater than 0.");
}
```

### Cross-Entity Invariants

If an invariant spans multiple entities:
- Enforce it in the **service layer**, not in domain.
- Domain entities remain self-contained.

---

## SOLID Principles in Domain

### Single Responsibility Principle (SRP)

**Rule:** Each entity has ONE reason to change.

Before adding logic to an entity:
1. Ask: "Is this behavior intrinsic to this entity?"
2. If NO, extract to service or value object.

Example:
- ✅ `Book.isReadable()` → Belongs to Book.
- ❌ `Book.calculateVelocity()` → Belongs to a KPI service.

### Open/Closed Principle (OCP)

**Rule:** Entities are open for extension, closed for modification.

- Use polymorphism or strategy pattern for variable behavior.
- Avoid conditional branching explosion.
- Prefer adding new classes over modifying existing ones.
- Prefer simple transition maps for small FSMs.
- Do NOT introduce polymorphism unless complexity justifies it.
- Avoid over-engineering for hypothetical future cases.

Example:
- ✅ Add `AbandonedBookState` class.
- ❌ Add `if (status === ABANDONED) { ... }` everywhere.

### Liskov Substitution Principle (LSP)

**Rule:** Derived types must be substitutable for base types.

- If using inheritance, subclasses MUST NOT violate base class contracts.
- Prefer composition over inheritance unless LSP holds.

### Interface Segregation Principle (ISP)

**Rule:** No entity should depend on methods it doesn't use.

- Avoid "god entities" with dozens of methods.
- Split large entities into smaller, focused ones.
- Use interfaces (via duck typing in JS) to define contracts.

### Dependency Inversion Principle (DIP)

**Rule:** Entities depend on abstractions, not concretions.

- Entities MUST NOT import repositories, services, or infrastructure.
- Use dependency injection if external dependencies are needed.

---

## Prohibited Practices

❌ **String literals for state values**  
❌ **Magic numbers**  
❌ **Domain logic in controllers or services**  
❌ **Input validation in entities** (validation is in controllers)  
❌ **Entities importing HTTP errors**  
❌ **Entities accessing repositories or databases**  
❌ **Anemic entities** (data containers with no behavior)  
❌ **Conditional branching explosion for state logic**  
❌ **Adding behavior without consulting DOMAIN.md**  
❌ **Reinterpreting or simplifying business rules**  
❌ **Throwing raw `Error` or strings** (use domain-specific errors)  

---

## Testing Domain Models

Domain tests must NOT:
- Test persistence mapping
- Test repositories
- Test HTTP behavior
- Test framework integrations

### Test Scope

- Test entity behavior, not implementation.
- Test invariant enforcement.
- Test state transitions.
- Test edge cases and boundary conditions.

### Test Pattern

Use **AAA** (Arrange, Act, Assert):
```javascript
test("should transition from WISH_LIST to READING when logging session", () => {
  // Arrange
  const book = new Book({ status: BookStatus.WISH_LIST, ... });
  
  // Act
  book.transitionTo(BookStatus.READING);
  
  // Assert
  expect(book.status).toBe(BookStatus.READING);
});
```

### Mock Nothing in Domain Tests

- Domain entities are pure logic.
- No mocks required unless entity uses external dependencies (which it shouldn't).

---

## SOLID Self-Check

**Before finalizing ANY domain-related change, you MUST explicitly evaluate:**

### 1. Single Responsibility Principle (SRP)
- [ ] Does this entity have exactly ONE reason to change?
- [ ] Is this behavior intrinsic to this entity, or does it belong elsewhere?
- [ ] Can this logic be extracted to a service, value object, or helper?

### 2. Open/Closed Principle (OCP)
- [ ] Is this change adding new behavior without modifying existing logic?
- [ ] Am I using polymorphism or strategy patterns instead of conditionals?
- [ ] Will future changes require modifying this entity again?

### 3. Liskov Substitution Principle (LSP)
- [ ] If using inheritance, can derived types substitute base types without breaking behavior?
- [ ] Am I violating any base class contracts?

### 4. Interface Segregation Principle (ISP)
- [ ] Does this entity expose only the methods it needs?
- [ ] Am I creating a "god entity" with too many responsibilities?
- [ ] Can this entity be split into smaller, focused entities?

### 5. Dependency Inversion Principle (DIP)
- [ ] Does this entity depend on abstractions, not concretions?
- [ ] Am I importing repositories, services, or infrastructure? (If yes, STOP.)
- [ ] Are dependencies injected, not hardcoded?

### Compliance Statement

After checking all five principles, you MUST:
1. Document violations (if any) in code comments.
2. Propose refactoring if violations are detected.
3. Justify why the change aligns with SOLID principles.

**If you cannot justify SOLID compliance, DO NOT proceed.**

---

## Expected Outcome

When this skill is applied correctly:

- Domain models are rich in behavior, not anemic.
- State transitions are explicit and declarative.
- Invariants are enforced at all times.
- Enums replace all magic strings and numbers.
- SOLID principles guide every design decision.
- Domain code is independent of infrastructure.
- DOMAIN.md and code are perfectly aligned.

---

## References

- DOMAIN.md (business rules)
- AGENTS.md (architectural rules)
- ARCHITECTURE.MD (layering rules)
- ERRORS.md (error design)
- api-errors skill (error handling)
- api-use-cases skill (service orchestration)
