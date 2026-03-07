---
name: api-reader-profile
description: Rules for implementing and maintaining the Reader Profile System used by AI services for context-aware recommendations.
---

## Scope

Apply when working with AIContextRepository, OpenAIClient, GetReaderProfileService, or adding profile refresh triggers.

---

## Source of Truth

1. **ARCHITECTURE.MD** - Section 12 (Reader Profile System)
2. **USE_CASES.MD** - Section 8 (GetReaderProfile)
3. **This skill** - Implementation patterns

---

## Core Principles

**1. Dual Representation:** Maintain structured JSON (`profile_data`) + semantic text (`semantic_summary`)

**2. Intelligent Refresh:** Deferred and condition-based

- ✅ Important events: `book_completed`, `book_abandoned` (mark pending only)
- ✅ Refresh execution: only when recommendations are requested and both conditions are true:
  - Profile age > 24h
  - `important_event_pending = true`
- ❌ Never: immediate refresh on book events
- ❌ Never: `top_authors_changed` trigger

**3. Graceful Degradation:** System MUST work without OpenAI

- If OpenAI fails: `semantic_summary = null`, profile still saves
- Profile refresh errors MUST NOT fail parent operations

**4. No Domain Model:** Profile is computed value object, not persistent entity

- No `ReaderProfile` class in `models/`
- Repository returns plain objects

**5. Schema Evolution:** Use `schemaVersion` field (1=MVP, 2=Complete)

---

## Repository Layer (AIContextRepository)

**Location:** `infraestructure/repositories/aiContextRepository.js`

### Aggregation Methods (Read-Only)

```javascript
// All aggregations are read-only (no transactions)
async _calculateStatistics() // Reuse bookRepository.calculateGlobalKPIs()
async _calculateTopAuthors() // Simple COUNT(*), top 5
async _calculateTopCountries() // Top 3 by nationality
async _calculateFavoriteBooks() // score >= 8
async _calculateAbandonedBooks() // All abandoned
```

**Rules:**

- Reuse existing repository methods (DRY)
- Return plain objects, not domain entities
- No transactions needed (read-only)

### MVP: Top Authors - Simple Count

```sql
-- Phase 1: Simple book count (all statuses)
SELECT TOP 5 a.name, c.name as nationality, COUNT(*) as bookCount
FROM Books b
JOIN Authors a ON b.author_id = a.id
JOIN Countries c ON a.nationality_id = c.id
GROUP BY a.name, c.name
ORDER BY bookCount DESC;
```

**Phase 2 Note:** Replace with affinity formula `(completed*2 + reading) - (abandoned*1.5)`

### Profile Storage

```javascript
async saveReaderProfile(version, profileData, semanticSummary, reason, tokensUsed)

async countBooksForProfileRequirement() // completed + abandoned
async markImportantEventPending() // set important_event_pending = 1
```

- Use `MERGE` for UPSERT (singleton pattern)
- Increment version on each save
- Allow `semantic_summary = null`

### Orchestration

```javascript
async calculateReaderProfile()
// - Orchestrate all _calculate*() methods
// - Set schemaVersion: 1 (MVP)
// - Does NOT save - returns computed object

async refreshReaderProfile(reason)
// 1. Get current profile for version
// 2. Calculate new data
// 3. Increment version
// 4. Call OpenAI (wrap in try/catch)
// 5. Save to database
// Returns: { version, profileData, semanticSummary, tokensUsed }
```

**Error handling:** If OpenAI fails, set `semanticSummary = null`, `tokensUsed = 0`, profile still saves.

### Minimum Requirement Rule

Profile creation requires:

- `completedBooks + abandonedBooks >= 5`

Use `countBooksForProfileRequirement()` before creating an initial profile.

---

## OpenAI Client

**Location:** `infraestructure/ai/openAIClient.js`

**Configuration:**

- Model: `gpt-3.5-turbo`
- Temperature: `0.4` (deterministic)
- Max tokens: `500` (cost control)
- Timeout: `15000ms`

**Methods:**

```javascript
async generateProfileSummary(profileData)
// Returns: { summary: string, tokensUsed: number }
// Throws: OpenAIUnavailableError, OpenAITimeoutError,
//         OpenAIRateLimitError (429), OpenAIInvalidAPIKeyError (401)

async checkHealth()
// Returns: { status: 'ok', model: string, organization?: string }
```

**Prompt Design Principles:**

**System Prompt:**

- Role: "analista literario experto" (not generic "asistente")
- Goal: "identificar patrones ocultos" + "insights accionables"
- Explicit: "NO simplemente repetir estadísticas"

**User Prompt Structure:**

1. **Data:** Condensed format (5 lines max, not verbose lists)
2. **Prohibitions (❌):** Explicitly forbid data repetition and obvious lists
3. **Requirements (✅):** Demand pattern identification, deductions, explanations
4. **Deliverables:** Specific artifacts (themes, anti-patterns, filtering strategies)

**What WORKS:**

- ✅ "Identifica patrones temáticos entre autores" → Forces theme analysis
- ✅ "Explica por qué abandonó X vs Y" → Requires comparative reasoning
- ✅ "Deduce qué busca (¿tensión? ¿realismo?)" → Extracts preferences
- ✅ Include abandoned books → Enables anti-pattern detection
- ✅ "Estrategias de filtrado accionables" → Produces usable rules

**What FAILS:**

- ❌ "Resume el perfil del lector" → Gets data repetition
- ❌ "Menciona preferencias claras" → Generic obvious statements
- ❌ Generic instructions without explicit prohibitions
- ❌ Omitting abandoned books → Loses valuable negative signals
- ❌ Verbose data sections → LLM defaults to reformulating input

**Output Quality Check:**

- Good: "Rechaza experimentación formal excesiva - prefiere narrativas lineales con tensión"
- Bad: "Ha completado 58 libros con tasa del 90.6%"

**Example Prompt (250 words max):**

```
Analiza este perfil e identifica patrones ocultos y preferencias subyacentes.

DATOS: [condensed 5-line format with abandonedBooks]

INSTRUCCIONES:
❌ NO repitas estadísticas
❌ NO hagas listas descriptivas
✅ IDENTIFICA patrones temáticos/género/estilo
✅ DEDUCE qué busca (tensión, realismo, etc)
✅ EXPLICA abandonos (diferencias con favoritos)
✅ RECOMIENDA estrategias de filtrado

Análisis en español, 3ra persona, tono profesional.
```

**Cost:** ~$0.001-0.002 USD per refresh (500 max_tokens)

---

## Service Layer (GetReaderProfileService)

**Location:** `services/getReaderProfileService.js`

**Methods:**

```javascript
async execute()
// options: { createIfEligible, refreshForRecommendations }
// - If missing and eligible (>=5 completed+abandoned): create with reason 'initial_profile'
// - For recommendations: refresh only if stale (>24h) and important_event_pending=true
// - Return profile or null

async markImportantEventPending()
// - Set important_event_pending = true when profile exists

async refreshIfNeeded(context)
// Backward-compatibility wrapper
// - For book_completed/book_abandoned: only mark pending event
// - Never refresh immediately

_isProfileStale(profile)
// Return true if profile null/undefined or last_updated > 24h
```

---

## Integration Pattern

```javascript
// Example: reviewBookService.js
class ReviewBookService {
  async execute({ bookId, score, comment }) {
    // ... existing logic ...

    try {
      await this.getReaderProfileService.markImportantEventPending();
    } catch (error) {
      console.warn("⚠️ Failed to mark reader profile event:", error.message);
      // Never throw - event marking is non-critical
    }

    return reviewedBook;
  }
}
```

**Rule:** Always wrap refresh in try/catch, never fail parent operation.

---

## Testing Requirements

**Unit Tests (80%+ coverage):**

```javascript
describe("AIContextRepository - MVP", () => {
  it("returns null when profile does not exist");
  it("sorts authors by book count DESC");
  it("limits to top 5 authors, top 3 countries");
  it("detects when top 3 authors change order");
  it("handles OpenAI unavailable (semantic_summary = null)");
});

describe("GetReaderProfileService", () => {
  it("marks pending event on book_completed");
  it("refreshes only when stale and pending event exists");
  it("does NOT create profile when completed+abandoned < 5");
  it("returns true for stale profile (>24h)");
});

describe("OpenAIClient - MVP", () => {
  it("respects max_tokens limit (300)");
  it("throws OpenAIRateLimitError when rate limit exceeded (429)");
  it("does NOT include Phase 2 data in prompt");
});
```

**Integration Tests:**

```javascript
describe("Reader Profile Integration - MVP", () => {
  it(
    "complete/abandon book → marks important_event_pending without immediate refresh",
  );
  it("recommendations request → refreshes only if stale + pending event");
  it("profile creation blocked when completed+abandoned < 5");
  it("profile refresh succeeds even if OpenAI unavailable");
  it("profile contains schemaVersion=1 for MVP");
});
```

**Mocking:** Mock `fetch` using Vitest's `vi.fn()` for OpenAI calls.

---

## Performance & Cost

**Targets:**

- Profile read: < 50ms
- Profile calculation: < 500ms
- Semantic generation: < 3s
- Total refresh: < 4s

**Cost:** ~$0.001-0.002 USD per refresh, <$0.01/month typical usage

---

## Explicit Prohibitions

❌ **DO NOT:**

- Create `ReaderProfile` class in `models/` (computed value object, not entity)
- Add business logic to repository
- Throw HTTP errors from repository/client (use domain errors)
- Block parent operations on profile refresh failures
- Create REST endpoints for profile CRUD (internal use only)
- Include Phase 2 features in MVP (affinity, signals, activity)

---

## Decision Priority

When conflicts arise, follow this hierarchy:

1. **DOMAIN.md** - Business rules
2. **AGENTS.md** - Agent constraints
3. **This skill** - Implementation patterns
4. **USE_CASES.MD** - Section 8
5. **ARCHITECTURE.MD** - Section 12

---

## Status

This skill is **binding** for Reader Profile implementations. Changes require human approval.
