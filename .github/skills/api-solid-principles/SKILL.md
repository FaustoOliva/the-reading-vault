---
name: api-solid-principles
description: SOLID principles checklist and compliance verification for domain entities. Use before finalizing any domain model change.
---

## Scope

This skill applies when:

- Creating or modifying domain entities
- Adding behavior to models
- Refactoring domain logic
- Reviewing domain design decisions
- **Before committing any domain-related code**

This skill is **mandatory** for all domain work in `packages/api/models/`.

---

## When to Apply

**Trigger this skill:**
- After implementing entity behavior
- Before finalizing pull requests touching domain
- During code reviews of domain changes
- When uncertain about design decisions

**Do NOT skip this check.** SOLID compliance is non-negotiable for domain models.

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

## Common Violations & Fixes

### Violation: Entity imports repository

```javascript
// ❌ BAD: Entity depends on infrastructure
import { BookRepository } from '../repositories/bookRepository.js';

class Book {
  async save() {
    const repo = new BookRepository();
    await repo.save(this);
  }
}
```

**Fix:** Move persistence to service layer.

```javascript
// ✅ GOOD: Service orchestrates persistence
// bookService.js
async function createBook(data, bookRepository) {
  const book = new Book(data);
  await bookRepository.save(book);
  return book;
}
```

### Violation: God entity with multiple responsibilities

```javascript
// ❌ BAD: Book handles reading logic AND KPI calculation
class Book {
  logSession(pages) { /* ... */ }
  calculateVelocity() { /* KPI logic */ }
  generateReport() { /* Reporting logic */ }
}
```

**Fix:** Extract responsibilities to dedicated classes/services.

```javascript
// ✅ GOOD: Book handles only book behavior
class Book {
  logSession(pages) { /* Book-specific logic */ }
}

// KPI service handles calculations
class KPIService {
  calculateVelocity(book, sessions) { /* ... */ }
}

// Report service handles formatting
class ReportService {
  generateBookReport(book) { /* ... */ }
}
```

### Violation: Conditional explosion for state logic

```javascript
// ❌ BAD: State logic scattered across conditionals
canLogSession() {
  if (this.status === WISH_LIST || this.status === READING) return true;
  if (this.status === COMPLETED && this.canReopen) return false;
  if (this.status === ABANDONED) return false;
  // ...more conditionals
}
```

**Fix:** Use state machine or transition map.

```javascript
// ✅ GOOD: Declarative state transitions
const VALID_SESSION_STATES = [BookStatus.WISH_LIST, BookStatus.READING];

canLogSession() {
  return VALID_SESSION_STATES.includes(this.status);
}
```

---

## Expected Outcome

When SOLID principles are correctly applied:

- Domain entities are **cohesive** (one responsibility).
- Domain entities are **extensible** without modification.
- Domain entities are **substitutable** (LSP holds).
- Domain entities are **focused** (no god classes).
- Domain entities are **independent** (no infrastructure dependencies).

---

## References

- [api-domain](../api-domain/SKILL.md) - Entity design rules
- [api-use-cases](../api-use-cases/SKILL.md) - Service orchestration rules
- [api-errors](../api-errors/SKILL.md) - Domain error handling
- DOMAIN.md - Business rules
- AGENTS.md - Architectural constraints
