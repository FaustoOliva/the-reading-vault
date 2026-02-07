---
name: documentation
description: Rules for creating, updating and auditing documentation as a minimal, enforceable contract for agents.
---

## Purpose

Documentation exists to provide:
- Clear contracts for agents
- Explicit responsibilities
- Minimal but sufficient context for correct execution

Documentation must NOT:
- Replace prompts with excessive verbosity
- Duplicate rules across files
- Grow without strict justification

---

## Scope

This skill applies when:
- Creating or updating markdown documents
- Auditing existing documentation
- Proposing structural or responsibility changes
- Translating documentation

---

## Core Principles

- Documentation must be **minimal, refined, and intentional**
- Each markdown file must have a **single, explicit responsibility**
- More lines do NOT mean better guidance
- If a rule can be inferred from another document, it should not be repeated

---

## Responsibility Boundaries

Each document has a fixed role:

- DOMAIN.md → Business rules (WHAT the system does)
- USE_CASES.md → Allowed system behaviors (WHAT can happen)
- ARCHITECTURE.md → Structural decisions (HOW the system is organized)
- AGENTS.md → Execution rules for agents (HOW agents build it)
- EXECUTION_CONTRACT.md → Global, minimal execution assumptions
- Skills → Operational constraints for specific activities

Overlaps between these documents are forbidden.

---

## Skills-Specific Rules

Skills must follow strict constraints to enable short, declarative prompts.

### Skill Creation Constraints

**MUST:**
- Have a single, narrow responsibility
- Use MUST/MUST NOT format for enforceability
- Remove explanatory text (keep only rules)
- Stay under ~450 lines (prefer much less)
- Be necessary for safe coding NOW (not future speculation)

**MUST NOT:**
- Overlap with other skills
- Include tutorials or extended examples
- Expand scope beyond necessity
- Add best practices not required immediately
- Include speculative features

### Skill Size Targets

| Lines | Status | Action |
|-------|--------|--------|
| < 100 | Ideal | Minimal, focused |
| 100-250 | Good | Well-scoped |
| 250-450 | Acceptable | Consider splitting |
| > 450 | Refactor | Split or reduce |

### Skill Audit Checklist

When creating or auditing a skill:

1. **Single Responsibility Test**
   - Can the skill be described in one sentence?
   - Does it cover only one concern?
   
2. **Overlap Test**
   - Does any rule appear in another skill?
   - Are responsibilities clearly separated?

3. **Necessity Test**
   - Is every rule needed NOW?
   - Can any be deferred until actually required?

4. **Enforceability Test**
   - Are rules MUST/MUST NOT (not SHOULD/CONSIDER)?
   - Can violations be detected objectively?

5. **Completeness Test**
   - Does the skill cover its responsibility fully?
   - Are there gaps that force agents to guess?

### Skill Separation Triggers

Split a skill when:
- It exceeds 450 lines and covers multiple concerns
- Two distinct responsibilities are detectably mixed
- Different parts have different trigger conditions
- Reducing line count requires losing necessary rules

Keep skills together when:
- Separation would create artificial boundaries
- Rules are tightly coupled in practice
- Total line count is reasonable (< 450)

### Example Skill Responsibilities

**Good (single responsibility):**
- expo-runtime → Runtime constraints and library preferences
- expo-router-navigation → File-based routing and navigation patterns
- mobile-state-management → State boundaries (server/UI/form)
- native-data-fetching → HTTP client patterns and authentication

**Bad (multiple responsibilities):**
- ❌ "Mobile development" → Too broad
- ❌ "React Native best practices" → Vague, not enforceable
- ❌ "Frontend patterns" → Multiple unrelated concerns

---

## Audit Rules (Mandatory)

When auditing documentation, the agent MUST:

### 1. Responsibility Audit
- Verify that each document has a single responsibility
- Detect responsibility leaks between documents
- Report overlaps explicitly

---

### 2. Size & Density Audit
- Flag documents that grow excessively without added clarity
- Question documents that exceed reasonable size for their role
- Recommend simplification or splitting when needed

---

### 3. Reference Audit
- Validate all relative paths and references
- Detect broken, ambiguous, or circular references
- Ensure references point to the correct source of truth

---

### 4. Consistency Audit
- Cross-check documents for contradictions
- Ensure terminology is consistent (names, enums, concepts)
- Detect duplicated rules expressed differently

---

### 5. Prompt Readiness Audit
- Evaluate whether the current documentation allows:
  - Short, declarative prompts
  - Minimal repetition of rules
- If long prompts are required, documentation is considered insufficient

---

### 6. Agent Usability Audit
- Verify that rules are enforceable, not aspirational
- Ensure prohibitions are explicit
- Detect vague or interpretative language

---

### 7. Skill Quality Audit (For .github/skills/)

When auditing skills specifically:

**Size Check:**
- Measure line count for each SKILL.md
- Flag skills > 450 lines for refactoring
- Report size distribution across all skills

**Responsibility Check:**
- Verify single responsibility per skill
- Detect overlapping rules between skills
- Identify skills that cover multiple concerns

**Format Check:**
- Ensure MUST/MUST NOT structure (not SHOULD/CONSIDER)
- Remove tutorial-style content
- Verify code examples are minimal (only when rules unclear)

**Necessity Check:**
- Validate all rules are needed NOW (not speculative)
- Identify "future feature" content for removal
- Confirm skill enables safe coding TODAY

**Completeness Check:**
- Ensure skill covers its responsibility fully
- No gaps that force agent interpretation
- Critical constraints are explicit

**Output Format:**
```
Skill: <name>
Lines: <count>
Status: [Ideal/Good/Acceptable/Refactor]
Responsibility: <one-sentence description>
Issues: [list] or None
```

---

## Change Rules

When proposing documentation changes:

- Changes must be justified by a concrete failure or ambiguity
- Adding lines requires stronger justification than removing lines
- Prefer refining existing rules over adding new ones
- Large additions must explain why minimal alternatives are insufficient

---

## Translation Rules

- AGENTS.md must be written in Spanish
- All other technical documentation must remain in English
- Meaning and authority must be preserved during translation
- No new rules may be introduced during translation

---

## Prohibited Practices

❌ Turning documentation into tutorials  
❌ Repeating the same rule across multiple files  
❌ Adding defensive verbosity instead of fixing structure  
❌ Encoding prompts inside markdown documents  

**For skills specifically:**

❌ Including "best practices" not required now  
❌ Adding speculative future features  
❌ Using SHOULD/CONSIDER instead of MUST/MUST NOT  
❌ Explaining WHY extensively (prefer concise justification)  
❌ Providing multiple examples for the same pattern  
❌ Covering multiple unrelated concerns in one skill  

---

## Skill Refactoring Examples

### Example: Reducing Overlap

**Before (building-native-ui - 321 lines):**
- ✗ Library preferences (belongs in expo-runtime)
- ✗ Navigation patterns (belongs in expo-router-navigation)
- ✗ Running the app (belongs in expo-runtime)
- ✓ UI component patterns
- ✓ Styling rules

**After (building-native-ui - 116 lines):**
- ✓ UI component patterns only
- ✓ Styling rules only
- Result: -64% reduction, clear responsibility

### Example: Extracting State Management

**Before (native-data-fetching - 492 lines):**
- ✗ React Query setup/patterns (state management concern)
- ✗ Offline support (speculative feature)
- ✗ Environment variables (runtime concern)
- ✓ Fetch API patterns
- ✓ Error handling
- ✓ Authentication

**After:**
- native-data-fetching (177 lines) → HTTP patterns only
- mobile-state-management (223 lines) → React Query, useState, forms
- Result: Clear separation, both skills < 450 lines

### Example: Creating Minimal New Skills

**Identified need:** Navigation rules for Expo Router

**Wrong approach:**
```markdown
# Expo Complete Guide (500+ lines)
- Running the app
- File conventions
- Navigation
- State management
- API calls
```

**Correct approach:**
```markdown
# expo-router-navigation (168 lines)
- File-based routing ONLY
- Navigation API (Link, router)
- Dynamic routes
- Query params
```

Result: Single responsibility, minimal, enforceable.

---

## Decision Tree: New Skill vs Extend Existing

### Create NEW skill when:
✓ Responsibility is clearly distinct from all existing skills  
✓ Combining would exceed 450 lines  
✓ Rules have different trigger conditions  
✓ Separation creates clearer boundaries  

### Extend EXISTING skill when:
✓ Responsibility is subset of existing skill  
✓ Total size would stay < 450 lines  
✓ Rules are tightly coupled in practice  
✓ Separation would create artificial boundaries  

### Refactor EXISTING skills when:
✓ Any skill exceeds 450 lines  
✓ Overlap detected between skills  
✓ Skill covers multiple distinct concerns  
✓ Tutorial content found instead of rules  

### Example Decisions:

**Scenario:** Need to add form validation rules  
**Decision:** Extend `mobile-state-management` (form state already covered)  
**Rationale:** Forms and validation are same concern, size OK

**Scenario:** Need animation performance rules  
**Decision:** Keep in `vercel-react-native-skills` (already exists)  
**Rationale:** External skill already handles this

**Scenario:** Need offline sync patterns  
**Decision:** DO NOT ADD (speculative, not needed now)  
**Rationale:** No current requirement, future feature

**Scenario:** Skill reaches 500 lines  
**Decision:** REFACTOR into 2+ skills with clear separation  
**Rationale:** Exceeds size limit, likely has multiple concerns  

---

## Expected Outcome

### For All Documentation:
- Documentation acts as a lightweight but strict contract
- Agents require minimal prompt context
- Responsibilities are unambiguous
- Documentation remains stable as the system grows

### For Skills Specifically:

**Quality Metrics:**
- Average skill size: < 200 lines (ideal)
- No skill > 450 lines
- Zero responsibility overlaps between skills
- 100% MUST/MUST NOT coverage (no vague language)

**Usability Metrics:**
- Agents can code from short prompts (< 2 sentences)
- No need to repeat rules from skills in prompts
- Agent can determine which skill applies automatically
- Zero ambiguity in constraint application

**Success Indicators:**
- Prompt: "Create book list screen" → Agent knows all patterns
- Prompt: "Add form validation" → Agent applies correct rules
- Prompt: "Navigate to detail" → Agent uses proper routing
- No follow-up questions about "how should I...?"

**Anti-patterns Eliminated:**
- Long instructional prompts
- Repeated architecture decisions in chat
- Agent asking for pattern preferences
- Multiple iterations to apply correct style
