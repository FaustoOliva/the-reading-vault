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

## 12. Reader Profile System

**Purpose:** Provides rich contextual data for AI-powered recommendations through dual representation (structured + semantic).

### Architecture Pattern

**Pattern:** Repository + Service (No Domain Model)  
**Storage:** Singleton table `ReaderProfiles` with computed aggregations  
**Update Strategy:**

- Important events are recorded as pending (`important_event_pending = 1`)
- Profile refresh happens only during recommendation requests when conditions are met

### Components

#### AIContextRepository

**Location:** `infrastructure/repositories/aiContextRepository.js`

**Responsibilities:**

- Aggregate reader data from Books, Authors, Countries
- Calculate profile statistics (MVP: simple counts, Phase 2: affinity scoring)
- Track pending important events for deferred refresh
- UPSERT profile with version increment
- Coordinate OpenAI calls for semantic summary

**Key Methods:**

- `getReaderProfile()` - Fetch current profile
- `calculateReaderProfile()` - Compute structured data from books
- `refreshReaderProfile(reason)` - Full refresh with OpenAI + save
- `countBooksForProfileRequirement()` - Count `COMPLETED + ABANDONED`
- `markImportantEventPending()` - Mark pending refresh signal

**Rules:**

- All aggregations are read-only (no transactions)
- Reuse existing repository methods (e.g., `bookRepository.calculateGlobalKPIs()`)
- Return plain objects, not domain entities
- Profile is a **computed value object**, not a persistent entity

#### OpenAIClient

**Location:** `infrastructure/ai/openAIClient.js`

**Responsibilities:**

- Generate narrative summaries from structured profile data
- Generate book recommendations and synergy analyses
- Manage OpenAI API communication
- Track token usage for cost monitoring
- Health check for connectivity verification

**Key Methods:**

- `generateProfileSummary(profileData)` - Call GPT-3.5-turbo
- `recommendBooks(input)` - Generate recommendation payloads
- `analyzeBookSynergy(input)` - Evaluate book-to-profile fit
- `analyzeAuthorSynergy(input)` - Evaluate author-to-profile fit
- `checkHealth()` - Validate API key and connectivity

**Configuration:**

- Model: `gpt-3.5-turbo`
- Temperature: `0.4` (deterministic)
- Max tokens: `500` for profile summary generation
- Timeout: `15000ms`

**Error Handling:**

- Falls back gracefully if unavailable (`semantic_summary = null`)
- Custom domain errors: `OpenAIUnavailableError`, `OpenAITimeoutError`, `OpenAIRateLimitError`, `OpenAIInvalidAPIKeyError`

#### GetReaderProfileService

**Location:** `services/getReaderProfileService.js`

**Responsibilities:**

- Orchestrate profile retrieval and intelligent refresh
- Decision logic for startup profile creation
- Decision logic for recommendation-time conditional refresh
- Staleness detection (>24h check)

**Key Methods:**

- `execute({ createIfEligible, refreshForRecommendations })`
- `markImportantEventPending()` - Called by services after complete/abandon
- `refreshIfNeeded(context)` - Backward-compatible wrapper that only marks events
- `_isProfileStale(profile)` - Check if >24 hours old

#### AI Query Services

**Pattern:** Thin orchestration services consuming reader profile + OpenAIClient

**Responsibilities:**

- Resolve the current reader profile
- Enforce minimum profile threshold before AI responses
- Choose semantic summary first, structured profile second
- Return structured payloads for mobile consumption

**Current/Target Services:**

- `RecommendBooksService`
- `AnalyzeBookSynergyService`
- `AnalyzeAuthorSynergyService`

**Integration Pattern:**

```javascript
// In reviewBookService.js
try {
  await this.getReaderProfileService.markImportantEventPending();
} catch (error) {
  console.warn("⚠️ Failed to mark profile event:", error.message);
  // Continue - profile event mark is non-critical
}
```

### Data Flow

```
Books/Authors/Countries (source data)
  ↓
AIContextRepository.calculateReaderProfile() (aggregations)
  ↓
OpenAIClient.generateProfileSummary() (LLM narration)
  ↓
ReaderProfiles table (stored profile)
  ↓
AI Services (consume for recommendations and synergy)
```

### Refresh Lifecycle

1. Important event occurs (`book_completed` or `book_abandoned`)
2. Service marks `important_event_pending = 1`
3. Recommendations are requested
4. System verifies profile exists (or creates it if missing and minimum rule is met)
5. Refresh executes only if both conditions are true:

- Profile is stale (`last_updated > 24h`)
- `important_event_pending = 1`

6. On successful refresh: calculate → generate summary → increment version → save with `important_event_pending = 0`

### Minimum Requirement Rule

- Reader profile can exist only when `COMPLETED + ABANDONED >= 5`
- Startup only creates profile if missing and the rule is met
- Recommendations require an existing profile; if the rule is not met, API returns a domain error

### Schema Versioning

- `schemaVersion: 1` = MVP (basic preferences: statistics, top authors/countries, favorites)
- `schemaVersion: 2` = Complete (adds author affinity, implicit signals, reading activity)

Versioning enables backward-compatible evolution without breaking existing integrations.

### Error Handling Strategy

**Non-blocking:** Profile refresh failures MUST NOT fail parent operations (book reviews, reopens).

**Graceful degradation:**

- OpenAI unavailable → `semantic_summary = null`, profile still saves
- Rate limit exceeded → Skip semantic generation, retry on next refresh
- Database errors → Log warning, continue parent operation

### Metadata Signals for AI

The AI layer may consume enriched book metadata when present:

- `bookType` for high-level editorial classification
- `genres` for thematic clustering
- `synopsis` for semantic context during summary generation and synergy analysis

These fields are optional and must not block standard book creation flows.

### Performance Targets

- Profile read: < 50ms
- Profile calculation: < 500ms
- Semantic generation: < 3s (OpenAI API latency)
- Total refresh: < 4s

### Cost Management

- Temperature: `0.4` (prevents overly creative/long responses)
- Max tokens: `500` for profile summary generation
- Estimated cost per refresh: ~$0.001-0.002 USD
- Monthly estimate (typical usage): < $0.01 USD

### External Dependencies

- **OpenAI API** (soft dependency with graceful degradation)
- **SQL Server JSON functions** (`FOR JSON PATH`, `JSON_VALUE`)

---

## 13. Explicit Prohibitions

❌ Business logic in controllers  
❌ Validation outside controllers  
❌ HTTP errors in models or repositories  
❌ Modular folder structures  
❌ Implicit dependencies  
❌ Silent error handling

---

## 14. Agent Usage Rules

AI agents must:

- Respect this structure strictly
- Prefer creating new files over modifying existing ones
- Validate every decision against this document
- Report ambiguities instead of guessing

---

## 15. References

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
