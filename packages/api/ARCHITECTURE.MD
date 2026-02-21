# API Architecture – The Reading Vault

## 1. Purpose

This document defines the **technical architecture** of the backend API.

Its goal is to:

- Freeze structural decisions
- Prevent architectural improvisation by AI agents
- Clearly define layer responsibilities and boundaries
- Enable consistent, predictable API construction

This document **does not define business rules**.  
Business rules live exclusively in `DOMAIN.md`.

---

## 2. Architectural Style

- Clean Architecture (layered, not modular)
- Flat structure by responsibility
- Explicit dependency flow
- Manual Dependency Injection
- No framework magic

The architecture prioritizes:

- Readability
- Explicitness
- Testability
- Agent-friendly constraints

---

## 3. Folder Structure (Canonical)

The API uses a **layer-based, non-modular structure**.

```
packages/api/
├── config
├── controllers
├── errors
│ ├── base
│ └── http
├── infrastructure
│ ├── config
│ ├── database
│ └── repositories
├── middlewares
├── models
├── routes
├── services
└── tests
```

This structure is **mandatory**.  
Agents must not introduce module-based subfolders.

---

## 4. Layer Responsibilities

### 4.1 Routes

**Responsibilities**

- Declare HTTP routes
- Bind routes to controllers
- Apply route-level middlewares

**Rules**

- No business logic
- No validation
- No error handling

---

### 4.2 Controllers

**Responsibilities**

- Handle HTTP requests and responses
- Validate input using Zod
- Call services
- Forward errors to global middleware

**Rules**

- Validation happens only here
- No business logic
- No domain error creation
- No infrastructure access

---

### 4.3 Services (Use Cases)

**Responsibilities**

- Implement application use cases
- Orchestrate domain models
- Control transactions
- Apply application-level rules

**Rules**

- One service = one use case
- Can throw domain errors
- Must not return error objects
- Must be framework-agnostic

---

### 4.4 Models (Domain)

**Responsibilities**

- Represent domain entities and value objects
- Enforce invariants
- Implement state machines (FSM)
- Own domain behavior

**Rules**

- No persistence logic
- No HTTP concerns
- No infrastructure imports
- Can throw domain errors

---

### 4.5 Repositories (Infrastructure)

**Responsibilities**

- Handle data persistence
- Translate DB records into domain models

**Rules**

- No business logic
- No HTTP errors
- Receive DB session/transaction explicitly
- Errors are translated in services

Repositories live in:
´´´
infrastructure/repositories
´´´

---

## 5. Dependency Flow

Dependencies are **strictly one-directional**:

```
Routes → Controllers → Services → Models
                        ↑
                        │
                Repositories (Infrastructure)
```

Infrastructure is accessed only by:

- Services via Repositories

Forbidden:

- Controllers accessing repositories
- Models importing infrastructure
- Cross-layer shortcuts

---

## 6. Dependency Injection

- Manual dependency injection only
- Dependencies are wired in:
  - application bootstrap
  - route composition

Rules:

- No global singletons
- No hidden dependencies
- Services receive repositories explicitly
- Repositories receive DB/session explicitly

---

## 7. Error Handling Strategy

- All errors extend `AppError`
- Domain errors originate in:
  - models
  - services
- Controllers delegate error handling
- Global error middleware:
  - maps errors to HTTP responses
  - logs operational errors

See:

- `api/docs/ERRORS.md`
- `.github/skills/api-errors/SKILL.md`

---

## 8. Transactions

- Transactions are owned by services
- Repositories are transaction-agnostic
- Any use case mutating multiple entities must be transactional

---

## 9. Logging

- Logging is allowed in:
  - services
  - middlewares
- Logging is forbidden in:
  - models
- Errors are logged centrally

---

## 10. Testing Strategy

- Tests live in `/test`
- Priority:
  1. Models (domain)
  2. Services (use cases)
  3. Controllers
- AAA pattern is mandatory
- Mocks only at layer boundaries

---

## 11. Naming Conventions

- Files and folders: camelCase
- Classes and Enums: PascalCase
- Variables and functions: camelCase
- Constants: SCREAMING_SNAKE_CASE

---

## 12. Explicit Prohibitions

❌ Business logic in controllers  
❌ Validation outside controllers  
❌ HTTP errors in models or repositories  
❌ Modular folder structures  
❌ Implicit dependencies  
❌ Silent error handling

---

## 13. Agent Usage Rules

AI agents must:

- Respect this structure strictly
- Prefer creating new files over modifying existing ones
- Validate every decision against this document
- Report ambiguities instead of guessing

---

## 14. References

- Clean Architecture – Robert C. Martin
- Domain-Driven Design – Eric Evans
- Internal documentation:
  - DOMAIN.md
  - AGENTS.md
  - ERRORS.md

---

## Document Status

This document is **architecturally binding**.  
Changes require explicit human approval.
