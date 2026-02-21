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

When auditing documentation, apply these three audit categories:

### 1. Structure Audit

**Checks:**
- Each document has a single, explicit responsibility
- No responsibility leaks or overlaps between documents
- Size is appropriate for the role (skills: target < 250 lines, hard limit 450 lines)
- Documents are split when they cover multiple concerns

**Questions:**
- Does this document do ONE thing well?
- Are there rules in this document that belong elsewhere?
- Is the size justified by the responsibility?

---

### 2. Quality Audit

**Checks:**
- All relative paths and references are valid
- No broken, ambiguous, or circular references
- Terminology is consistent across documents
- No contradictions between documents
- References point to the correct source of truth

**Questions:**
- Can I navigate all links successfully?
- Are the same concepts called the same thing everywhere?
- Do documents agree on rules and constraints?

---

### 3. Enforceability Audit

**Checks:**
- Rules use MUST/MUST NOT (not SHOULD/CONSIDER)
- Prohibitions are explicit and unambiguous
- Rules are enforceable today (not aspirational)
- No vague or interpretative language
- Code examples are minimal and justified
- No tutorial content (only rules)

**For Skills Specifically:**
- Single responsibility per skill
- Size: target < 250 lines, hard limit < 450 lines
- All rules are needed NOW (no speculative features)
- Skill enables safe coding immediately

**Output Format:**
```
Skill: <name>
Lines: <count>
Status: [Under 250 ✅ | 250-400 ⚠️ | 400+ 🔴]
Responsibility: <one-sentence>
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

## Skill Refactoring Patterns

### When to Split Skills

**Split when:**
- Skill exceeds 400 lines
- Skill covers multiple distinct responsibilities
- Rules have different trigger conditions
- Overlap detected with another skill

**Examples:**
- Split `building-native-ui` (321 lines) → Extract visual feedback patterns if needed
- Split `api-domain` (465 lines) → Extract SOLID principles to separate skill ✅ Done
- Split `documentation` (391 lines) → Consolidate audit types, simplify examples ✅ Done

### When to Merge/Consolidate

**Merge when:**
- Two skills have overlapping responsibilities
- Combined size stays < 250 lines
- Rules are tightly coupled in practice

**Examples:**
- Consolidate color rules: building-native-ui → Defer to mobile-accessibility
- Consolidate safe area: expo-runtime → Keep only in building-native-ui

### When to Extract

**Extract when:**
- A section within a skill is independently reusable
- Extraction creates clearer boundaries
- Extracted content is 80-150 lines

**Examples:**
- Extract form component patterns → Add to mobile-state-management (if < 250 lines)
- Extract animation patterns → Create mobile-visual-feedback if building-native-ui exceeds 300

---

## Decision Tree: New Skill vs Extend Existing

### Create NEW skill when:
✓ Responsibility is clearly distinct from all existing skills  
✓ Combining would exceed 250 lines (target) or 400 lines (hard limit)  
✓ Rules have different trigger conditions  
✓ Separation creates clearer boundaries  

### Extend EXISTING skill when:
✓ Responsibility is subset of existing skill  
✓ Total size would stay < 250 lines  
✓ Rules are tightly coupled in practice  
✓ Separation would create artificial boundaries  

### Refactor EXISTING skills when:
✓ Any skill exceeds 400 lines  
✓ Overlap detected between skills  
✓ Skill covers multiple distinct concerns  
✓ Tutorial content found instead of rules  

---

## Expected Outcome

### For All Documentation:
- Documentation acts as a lightweight but strict contract
- Agents require minimal prompt context
- Responsibilities are unambiguous
- Documentation remains stable as the system grows

### For Skills Specifically:

**Quality Metrics:**
- Target skill size: < 250 lines
- Hard limit: < 450 lines
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
