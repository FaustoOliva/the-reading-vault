# Agent Execution Rules - The Reading Vault

**Version:** 2.0 | **Last Updated:** February 6, 2026

---

## Agent Role

You act as the lead developer for **The Reading Vault** project.
Your objective is to build the application by strictly following the architectural, domain, and quality rules defined in this repository.

You can create folders, files, and new code autonomously.
The human will review, adjust, or correct when necessary.

---

## Language and Standards

- Operational instructions and documentation: **English**
- Code, names, comments, tests, and commits: **English**
- Do not mix languages within code.

## Naming Conventions

- Files and folders: camelCase
- Classes: PascalCase
- Variables / functions: camelCase
- Enums: PascalCase
- Constants: SCREAMING_SNAKE_CASE

---

## General Architecture

- Monorepo with clearly separated modules.
- Backend API based on **Clean Architecture**.
- Well-defined layers, no shortcuts or improper layer crossings.

### API Layers

1. **Routes**
2. **Controllers**
3. **Services (Use Cases)**
4. **Repositories**
5. **Domain (Entities, Enums, FSM)**

### Git Workflow & Commits

Follow the **Conventional Commits** standard:
* `feat(scope): description`
* `fix(scope): description`
* `docs(scope): description`
* `test(scope): description`

---

## Non-Negotiable Rules

### Validation

- Input validation **only occurs in Controllers** using Zod.
- Services and Entities **assume validated data**.
- Re-validating data in Services or Domain is prohibited.

### Domain

- Rich entities with behavior (Rich Domain Model).
- **All domain logic MUST live in Models/Entities**, never in Services.
- Services (Use Cases) **only orchestrate** calls to Repositories and Entities.
- State transition logic: **Models**.
- Business rule validations: **Models**.
- Derived state calculations: **Models**.
- Services MUST NOT expose or duplicate logic that belongs to Entities.
- State machines (FSM) are **explicit** and live in the domain.
- DTOs do not exist within the domain.

**Correct example:**
```javascript
// ✅ Book.js (Model)
calculateTransition(currentPages, pagesRead) {
  // Transition logic here
}

// ✅ Service
const transition = book.calculateTransition(currentPages, pagesRead);
```

**Incorrect example:**
```javascript
// ❌ Service exposes domain logic
if (book.status === WISH_LIST) {
  newStatus = READING; // This belongs in Book model!
}
```

### Errors

- Every error must extend `AppError`.
- The HTTP error hierarchy is mandatory.
- **Models/Entities CAN throw Domain Errors** (e.g., `BookClosedError`, `InvalidStateTransitionError`).
- Controllers DO NOT create domain errors (only capture and respond).
- Repositories DO NOT know about HTTP (throw domain errors, not HTTP).
- Services capture domain errors and propagate them.

**Hierarchy:**
```
AppError (base)
├── HTTP Errors (BadRequestError, NotFoundError, ConflictError...)
└── Domain Errors (BookClosedError, InvalidStateTransitionError...)
```

**Correct example:**
```javascript
// ✅ Book.js (Model)
ensureCanAcceptSession() {
  if (this.status === ABANDONED) {
    throw new BookClosedError(this.id, this.status);
  }
}
```

### Transactions

- Services control transactions.
- Repositories receive the session/transaction as a parameter.
- Any operation that mutates multiple tables must be transactional.

---

## Business Domain

- Business rules are defined in `DOMAIN.md`.
- `DOMAIN.md` is the **Single Source of Truth** for business logic.
- Do not reinterpret or simplify business rules.
- When in doubt, prefer domain over infrastructure.

---

## Expected Working Style

- Prefer **creating new files** over modifying existing code.
- Keep files small and responsibilities clear.
- Name files and folders explicitly and consistently.
- Do not introduce "temporary" logic or hacks.

---

## Explicit Prohibitions

- No business logic in controllers.
- No validation outside of Zod.
- No errors thrown as strings.
- No direct database access outside of repositories.
- No layer mixing for convenience.
- **NEVER modify .md files (documentation) without explicitly consulting the human**.
- Do not create unnecessary DTOs; use domain entities directly when possible.

---

## Decision Priority

When making decisions, follow this hierarchy:

1. **DOMAIN.md** - Business rules (WHAT the system does)
2. **AGENTS.md** (this document) - Agent behavior and architectural constraints
3. **EXECUTION_CONTRACT.md** - Execution patterns (HOW code executes)
4. **Specific Skills** - Specialized rules in `.github/skills/`
5. **Technical Documentation** - ARCHITECTURE.md, USE_CASES.md, ERRORS.md
6. **Existing Code** - Patterns in the codebase

If documents conflict, higher priority wins. If unclear, STOP and ask.

---

## Document Authority

This document defines **HOW agents should work**, not WHAT the system does.

- **Business rules** → DOMAIN.md
- **Execution patterns** → EXECUTION_CONTRACT.md
- **Agent behavior** → AGENTS.md (this document)

**Status:** This document is binding for all AI agents.
Changes require explicit human approval.
