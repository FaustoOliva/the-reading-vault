# Product Decision Brief: Web-First Experience

> **Status:** Product direction approved. This is not an implementation spec, task plan, or SDD artifact.
> `DOMAIN.md` remains the single source of truth for business rules.

## Purpose

Record the product foundations for making the browser the primary Reading Vault experience, renewing the web UX/UI beyond a single screen, and adding annual statistics and a shareable year card — without expanding native scope. This brief exists so future work starts from agreed intent instead of re-litigating it.

## Agreed decisions

| Area                     | Decision                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary experience       | The app is already run in the browser through `--web`; web is the primary target for a broad UX/UI renewal.                                            |
| Web scope                | Renew the web UX/UI broadly across the product, not one screen.                                                                                        |
| Native scope             | Keep native support as-is. Do not remove it and do not expand native scope now.                                                                        |
| Annual statistics        | Count books that entered `PENDING_SCORE` during the year being viewed; this marks when reading is finished.                                            |
| Legacy annual statistics | Exclude books imported directly as `COMPLETED` when no `PENDING_SCORE` event is available.                                                             |
| Book-to-book comparison  | Book comparisons show time to finish, pages/day, and session count, for the completed reading cycle.                                                   |
| Time to finish           | Count calendar dates from the first session's reading date through the finishing session's reading date, inclusive; same-day completion is one day.    |
| Sharing                  | Generate a vertical annual-statistics card the user downloads and uploads manually as an Instagram Story.                                              |
| Non-goal                 | Direct Instagram publishing is not an agreed requirement.                                                                                              |
| Local MCP access         | A local stdio MCP server lets an LLM create books and log reading sessions without opening the app. It is a local child process, not a remote service. |

## Rules already settled by DOMAIN.md

These are cited, not open. Do not re-decide them in UI work.

| Rule                                                                                                         | Source           | Effect on this product slice                                                       |
| ------------------------------------------------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------- |
| A reading cycle is a contiguous start-to-finish period; KPIs are calculated per cycle.                       | `DOMAIN.md` §4.2 | Comparison rows are cycle-scoped, one row per completed cycle, not per book title. |
| Pages/day = pages read in the cycle ÷ inclusive calendar days from first to latest session, minimum one day. | `DOMAIN.md` §5.1 | Same-day completion shows as one day; no separate "product formula" exists.        |
| Session count is `total_sessions_in_cycle`.                                                                  | `DOMAIN.md` §5.3 | Session count is per cycle; re-reads do not aggregate across cycles.               |

**Implementation drift, not a product choice:** existing aggregate queries approximate pace and book counts with all-time semantics. That gap is a defect to align with the domain, not a decision to be made here.

## Approved product design

### 1. Annual view structure and content

Single scrolling page per year, in this order:

1. **Header** — year selector and one-line summary: `12 books finished in 2026`.
2. **Headline stats** (four, no more): books finished · pages read · reading days · average pages/day (mean of cycle velocities).
3. **Highlights** — fastest finish, longest book, highest-rated finished book, each with a one-line detail.
4. **Comparison** — the full list of finished cycles for that year (see §3).

Rationale: books finished pairs with effort (pages) and consistency (days, pace), so the year reads as a story rather than a counter. Streak metrics stay out of the first slice because they need a separate cross-year definition.

### 2. Year selection and empty state

- Default year: the current year.
- Selector lists only years that contain at least one qualifying finish, newest first, plus the current year. Years with no data never appear, so an empty screen is not reachable by accident.
- Web URL reflects the selection (`?year=2026`) so a year view is linkable and back/forward works.
- Empty state (current year, nothing finished): `No books finished in 2026 yet.` plus one sentence explaining that a book counts when it reaches review, and a single action to log a session. When a year with data exists, offer `View 2025 instead`.

### 3. Comparison presentation and missing data

- **Rows:** one per finished cycle, showing book title, author, sessions, days, and pages/day.
- **Order:** finish date, most recent first. Highlights cover the extremes, so no sort control is needed initially.
- **Shared scale:** a single horizontal bar encodes pages/day across the visible rows, so relative pace is readable at a glance.
- **Missing data:** a cycle with no recorded sessions has no first reading date. Show `No session data` in place of days and pages/day, keep the book in the "books finished" count, and exclude it from roster averages and highlights. Never substitute zero or invent a duration.

### 4. Web UX direction

- **Reuse, don't rebrand:** keep the existing palette and semantic tokens (slate surfaces, blue-600 primary, WCAG AA pairs) and the existing type scale. No new design system in this slice.
- **Navigation:** at ≥1024px replace the bottom tab bar with a grouped left sidebar (Books, Add Book, Log Session, Stats, AI); keep the tab bar below that width. Preserve current routes and deep links.
- **Canvas:** a fluid, centered content area capped at 1560px with responsive page padding (16 → 40px). On 1920px screens the library uses the width left by the sidebar instead of a narrow centered column.
- **Responsive layouts:** three viewport bands with materially different page structures, not a single navigation swap. Below 1024px pages stack and dense content collapses. At 1024–1439px the sidebar appears, pages keep one wide fluid column, and KPI cards render two across. At ≥1440px pages split into real columns: a filter rail beside the library list, two-column book and session forms with a context panel, and two-across recommendation cards.
- **Statistics:** the annual view is a full-width report — header with year selector, two-across KPI cards at 1024–1439px and four-across at ≥1440px, three-across highlights when space allows, and a full-width cycle comparison whose pace column grows with the viewport. The share card sits below at a readable fixed width.
- **Accessibility:** visible keyboard focus, semantic headings, a real table with column headers on desktop, 44px minimum targets, `prefers-reduced-motion` respected, no color-only meaning.
- **Privacy:** no third-party analytics or tracking added in this slice; statistics render only the signed-in user's own data.

### 5. Share card

- **Format:** vertical 1080×1920 PNG, primary content inside the central safe area so Instagram Story chrome does not cover it.
- **Content (aggregate only, by default):** year, books finished, pages read, average pages/day, reading days, and the app wordmark. No book titles, authors, or scores — a story card should not silently publish library contents.
- **Legibility:** every number carries a text label; the card is understandable with no surrounding context and needs no chart reading.
- **Flow:** `Create year card` on the annual view → in-place preview → `Download PNG` → browser download. Uploading to Instagram remains manual. No share SDK, no server-side image service, no direct publishing.
- **Later, separately:** a variant that includes one chosen book title would be opt-in and requires its own approval.

### 6. Local MCP access

Approved after the initial brief, for the same local-first product context.

- **Purpose:** Let a local LLM (for example an OpenCode session) create books and log reading sessions without the user opening the app.
- **Transport:** A local child process over stdio. Not remote HTTP, not hosted, no credentials or network endpoints.
- **Tool surface (deliberately narrow):** create a book, create a reading session, and the minimal read/search tool needed to find an existing book before logging a session and to avoid duplicate books.
- **Execution boundaries:** Tools run through the existing application use cases, dependency injection, and repositories. The MCP adapter does not query the database directly, does not duplicate domain rules, and does not require the React UI to be running.
- **Dependency carve-out:** The official MCP TypeScript SDK (`@modelcontextprotocol/server`) is authorized for this capability and nothing else. No other dependency is authorized by this section.
- **Out of scope:** Remote or hosted MCP endpoints, MCP authentication, and any tool beyond the three listed above.

### 7. Reading activity chart (approved later)

Approved by the user after the initial brief: the annual view also carries a small pages-read chart for the selected year, plotted month by month.

- **Data scope:** every non-deleted reading session whose reading date (`occurred_at`) falls in the selected calendar year, summing `pages_read` across all books, reading cycles and statuses — including books still in progress and books finished or abandoned later. This series is not filtered by `PENDING_SCORE`.
- **Shape:** first quadrant, one point per month of the selected year on the X axis and that month's pages read on the Y axis. Values are monthly totals, so the series may rise or fall; it is not cumulative and carries no running total. It uses the same year selection as the rest of the annual page.
- **Rendering:** a dependency-free line chart with points joined by segments. No vertical bars and no chart library.
- **Interaction:** on web, hovering a month's point (or the segment next to it) with a mouse or pen shows a compact tooltip with that month and its page count, and the tooltip hides when the pointer leaves the plot. Keyboard focus on a month exposes the same value. Touch and native keep the chart read-only, with the monthly table as the fallback.
- **Separation of scopes:** the chart is labeled reading activity and stays visually separate from finished-cycle output. `books_finished`, `pages_read`, `reading_days`, `average_pages_per_day`, highlights and the cycle comparison stay `PENDING_SCORE`/finished-cycle scoped and must never be derived from this series.
- **API:** the existing annual summary response (`GET /api/kpis/annual?year=`) is extended with `monthly_activity`: twelve entries carrying `month` and that month's `pages_read` total, zero-filled where no session exists. No schema change and no new endpoint.
- **Presentation:** responsive rendering with an accessible monthly text/table fallback, consistent with §4.

### 8. Deliberately out of this slice

Dark-mode redesign, animations beyond standard transitions, social profiles, leaderboards, year-over-year deltas, CSV export, and any native parity work. Remote MCP transport, hosted MCP servers, and MCP authentication are also out.

## Approval boundaries

- The existing year-scoped annual query (`GET /api/kpis/annual?year=`) plus the additive `monthly_activity` series are approved and implemented. Any further API contract, schema, or domain-rule change still requires separate approval; this brief only fixes the intended product behavior.
- Client-side or server-side card rendering is an implementation choice, not a product decision; it stays unset here on purpose.
- Nothing here authorizes schema changes, API contract changes, domain rule changes, new dependencies, or data-retention changes. Those follow `AGENTS.md` and `DOMAIN.md`. Two carve-outs exist: the official MCP TypeScript SDK (`@modelcontextprotocol/server`) for the local MCP server only, and the `monthly_activity` series appended to the existing annual summary response for the reading-activity chart (§7). Both are additive; neither changes the finished-cycle figures.
- Product choices in this section are approved. Implementation must still respect the approval boundaries above.
